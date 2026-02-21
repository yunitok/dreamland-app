/**
 * Servicio de consulta meteorológica para el Protocolo de Alertas.
 * Soporta AEMET (España) y OpenWeatherMap como fallback.
 * Filtra temperaturas por franja horaria de servicio (configurable).
 */

export interface WeatherForecastDay {
  date: string             // ISO date string (YYYY-MM-DD)
  precipitationMm: number
  precipitationProbability: number  // 0-100
  windSpeedKmh: number
  windGustKmh: number
  temperatureMinC: number
  temperatureMaxC: number
  description: string
}

export interface WeatherThresholds {
  rainProbability: number   // %
  rainMm: number            // mm
  windSpeed: number         // km/h
  windGust: number          // km/h
  temperatureLow: number    // °C
  temperatureHigh: number   // °C
}

export interface GeneratedAlert {
  alertType: "RAIN" | "WIND" | "TEMPERATURE_HIGH" | "TEMPERATURE_LOW" | "STORM" | "SNOW" | "HAIL" | "FOG"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string
  forecastDate: Date
  precipitationMm: number | null
  windSpeedKmh: number | null
  temperatureC: number | null
  threshold: number | null
  rawForecastData: Record<string, unknown>
}

export const DEFAULT_THRESHOLDS: WeatherThresholds = {
  rainProbability: 50,
  rainMm: 5,
  windSpeed: 40,
  windGust: 60,
  temperatureLow: 8,
  temperatureHigh: 36,
}

// --- Utilidades de franja horaria ---

/**
 * Comprueba si una hora (0-23) cae dentro de la franja de servicio.
 * Soporta franjas que cruzan medianoche (ej: 12-0 = 12:00 a 00:00).
 */
function isWithinServiceHours(hour: number, start: number, end: number): boolean {
  if (start <= end) {
    // Franja normal: ej. 8-22
    return hour >= start && hour < end
  }
  // Franja que cruza medianoche: ej. 12-0 significa 12:00-23:59
  // end === 0 significa medianoche
  if (end === 0) return hour >= start
  return hour >= start || hour < end
}

// --- AEMET Diaria (fallback) ---

interface AemetPredictionDay {
  fecha: string
  probPrecipitacion: Array<{ periodo: string; valor: number }>
  precipitacion?: Array<{ periodo: string; valor: number }>
  vientoAndRachaMax?: Array<{ velocidad?: string[]; value?: string }>
  viento?: Array<{ velocidad: number; direccion: string }>
  rachaMax?: Array<{ valor: string }>
  temperatura: { maxima: number; minima: number }
}

export async function fetchAemetForecast(municipioId: string): Promise<WeatherForecastDay[]> {
  const apiKey = process.env.AEMET_API_KEY
  if (!apiKey) {
    console.warn("[weather] AEMET_API_KEY no configurada")
    return []
  }

  try {
    const metaRes = await fetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${municipioId}`,
      { headers: { "api_key": apiKey }, cache: "no-store" }
    )
    const meta = await metaRes.json()

    if (!meta.datos) {
      console.error("[weather] AEMET sin campo datos:", meta)
      return []
    }

    const dataRes = await fetch(meta.datos, { cache: "no-store" })
    const data = await dataRes.json()

    const prediction = data[0]?.prediccion?.dia as AemetPredictionDay[] | undefined
    if (!prediction) return []

    return prediction.slice(0, 3).map((day) => {
      const maxPrecipProb = Math.max(...day.probPrecipitacion.map(p => p.valor || 0))
      const rachaValues = day.rachaMax?.map(r => parseFloat(r.valor) || 0) ?? []
      const maxGust = rachaValues.length > 0 ? Math.max(...rachaValues) : 0

      return {
        date: day.fecha.split("T")[0],
        precipitationMm: 0,
        precipitationProbability: maxPrecipProb,
        windSpeedKmh: 0,
        windGustKmh: maxGust,
        temperatureMinC: day.temperatura.minima,
        temperatureMaxC: day.temperatura.maxima,
        description: `Precip. ${maxPrecipProb}%, Rachas ${maxGust} km/h, Temp ${day.temperatura.minima}-${day.temperatura.maxima}°C`,
      }
    })
  } catch (error) {
    console.error("[weather] Error fetching AEMET:", error)
    return []
  }
}

// --- AEMET Horaria (preferida — filtra por franja de servicio) ---

interface AemetHourlyDay {
  fecha: string
  temperatura: Array<{ value: string; periodo: string }>       // periodo: "00", "01", ..., "23"
  probPrecipitacion: Array<{ value: number; periodo: string }>  // periodo: "0006", "0612", etc.
  viento?: Array<{ velocidad: string[]; direccion: string[]; periodo: string }>
  rachaMax?: Array<{ value: string; periodo: string }>
}

export async function fetchAemetHourlyForecast(
  municipioId: string,
  serviceHoursStart: number = 12,
  serviceHoursEnd: number = 0,
): Promise<WeatherForecastDay[]> {
  const apiKey = process.env.AEMET_API_KEY
  if (!apiKey) {
    console.warn("[weather] AEMET_API_KEY no configurada")
    return []
  }

  try {
    const metaRes = await fetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${municipioId}`,
      { headers: { "api_key": apiKey }, cache: "no-store" }
    )
    const meta = await metaRes.json()

    if (!meta.datos) {
      console.error("[weather] AEMET horaria sin campo datos:", meta)
      return []
    }

    const dataRes = await fetch(meta.datos, { cache: "no-store" })
    const data = await dataRes.json()

    const prediction = data[0]?.prediccion?.dia as AemetHourlyDay[] | undefined
    if (!prediction) return []

    // La API horaria devuelve hasta 48h (~2 días). Procesamos cada día.
    return prediction.slice(0, 3).map((day) => {
      // Temperaturas: filtrar solo horas de servicio
      const allTemps = day.temperatura?.map(t => ({
        hour: parseInt(t.periodo, 10),
        value: parseFloat(t.value),
      })).filter(t => !isNaN(t.value) && !isNaN(t.hour)) ?? []

      const serviceTemps = allTemps.filter(t => isWithinServiceHours(t.hour, serviceHoursStart, serviceHoursEnd))
      // Si no hay datos en franja de servicio, usar todos los disponibles
      const tempsToUse = serviceTemps.length > 0 ? serviceTemps : allTemps

      const tempMin = tempsToUse.length > 0 ? Math.min(...tempsToUse.map(t => t.value)) : 0
      const tempMax = tempsToUse.length > 0 ? Math.max(...tempsToUse.map(t => t.value)) : 0

      // Precipitación: usar todos los periodos del día (afecta independientemente del horario)
      const maxPrecipProb = day.probPrecipitacion
        ? Math.max(...day.probPrecipitacion.map(p => p.value || 0), 0)
        : 0

      // Rachas de viento: máxima del día
      const rachaValues = day.rachaMax?.map(r => parseFloat(r.value) || 0) ?? []
      const maxGust = rachaValues.length > 0 ? Math.max(...rachaValues) : 0

      return {
        date: day.fecha.split("T")[0],
        precipitationMm: 0,
        precipitationProbability: maxPrecipProb,
        windSpeedKmh: 0,
        windGustKmh: maxGust,
        temperatureMinC: tempMin,
        temperatureMaxC: tempMax,
        description: `Precip. ${maxPrecipProb}%, Rachas ${maxGust} km/h, Temp servicio ${tempMin}-${tempMax}°C`,
      }
    }).filter(day => day.date) // Filtrar días sin fecha
  } catch (error) {
    console.error("[weather] Error fetching AEMET horaria:", error)
    return []
  }
}

// --- OpenWeatherMap (fallback) — con filtro por franja de servicio ---

export async function fetchOpenWeatherForecast(
  lat: string,
  lon: string,
  serviceHoursStart: number = 12,
  serviceHoursEnd: number = 0,
): Promise<WeatherForecastDay[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    console.warn("[weather] OPENWEATHER_API_KEY no configurada")
    return []
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
      { cache: "no-store" }
    )
    const data = await res.json()

    // Agrupar por día (OWM devuelve intervalos de 3h)
    const dayMap = new Map<string, {
      allTemps: number[]
      serviceTemps: number[]
      winds: number[]
      rain: number
      desc: string[]
    }>()

    for (const item of data.list ?? []) {
      const [date, time] = item.dt_txt.split(" ")
      const hour = parseInt(time.split(":")[0], 10)

      if (!dayMap.has(date)) {
        dayMap.set(date, { allTemps: [], serviceTemps: [], winds: [], rain: 0, desc: [] })
      }
      const d = dayMap.get(date)!
      d.allTemps.push(item.main.temp)
      if (isWithinServiceHours(hour, serviceHoursStart, serviceHoursEnd)) {
        d.serviceTemps.push(item.main.temp)
      }
      d.winds.push(item.wind.speed * 3.6) // m/s → km/h
      d.rain += item.rain?.["3h"] ?? 0
      if (item.weather?.[0]?.description) {
        d.desc.push(item.weather[0].description)
      }
    }

    const result: WeatherForecastDay[] = []
    for (const [date, d] of Array.from(dayMap.entries()).slice(0, 3)) {
      const tempsToUse = d.serviceTemps.length > 0 ? d.serviceTemps : d.allTemps
      result.push({
        date,
        precipitationMm: d.rain,
        precipitationProbability: d.rain > 0 ? 80 : 10,
        windSpeedKmh: Math.max(...d.winds),
        windGustKmh: Math.max(...d.winds) * 1.4,
        temperatureMinC: Math.min(...tempsToUse),
        temperatureMaxC: Math.max(...tempsToUse),
        description: [...new Set(d.desc)].join(", "),
      })
    }

    return result
  } catch (error) {
    console.error("[weather] Error fetching OpenWeather:", error)
    return []
  }
}

// --- Evaluación de umbrales ---

function determineSeverity(exceedances: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (exceedances >= 3) return "CRITICAL"
  if (exceedances >= 2) return "HIGH"
  if (exceedances >= 1) return "MEDIUM"
  return "LOW"
}

export function evaluateThresholds(
  forecast: WeatherForecastDay[],
  thresholds: WeatherThresholds = DEFAULT_THRESHOLDS
): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = []

  for (const day of forecast) {
    // Lluvia
    if (day.precipitationProbability > thresholds.rainProbability || day.precipitationMm > thresholds.rainMm) {
      const exceedances = (day.precipitationProbability > 70 ? 1 : 0) + (day.precipitationMm > 15 ? 1 : 0)
      alerts.push({
        alertType: "RAIN",
        severity: determineSeverity(exceedances + 1),
        description: `Previsión de lluvia: prob. ${day.precipitationProbability}%, ${day.precipitationMm}mm. ${day.description}`,
        forecastDate: new Date(day.date),
        precipitationMm: day.precipitationMm,
        windSpeedKmh: null,
        temperatureC: null,
        threshold: thresholds.rainMm,
        rawForecastData: day as unknown as Record<string, unknown>,
      })
    }

    // Viento
    if (day.windSpeedKmh > thresholds.windSpeed || day.windGustKmh > thresholds.windGust) {
      const exceedances = (day.windGustKmh > 80 ? 2 : day.windGustKmh > 60 ? 1 : 0)
      alerts.push({
        alertType: "WIND",
        severity: determineSeverity(exceedances + 1),
        description: `Previsión de viento: ${day.windSpeedKmh} km/h, rachas ${day.windGustKmh} km/h.`,
        forecastDate: new Date(day.date),
        precipitationMm: null,
        windSpeedKmh: day.windSpeedKmh,
        temperatureC: null,
        threshold: thresholds.windSpeed,
        rawForecastData: day as unknown as Record<string, unknown>,
      })
    }

    // Temperatura baja
    if (day.temperatureMinC < thresholds.temperatureLow) {
      alerts.push({
        alertType: "TEMPERATURE_LOW",
        severity: day.temperatureMinC < 3 ? "HIGH" : "MEDIUM",
        description: `Previsión de frío extremo: mín. ${day.temperatureMinC}°C, máx. ${day.temperatureMaxC}°C.`,
        forecastDate: new Date(day.date),
        precipitationMm: null,
        windSpeedKmh: null,
        temperatureC: day.temperatureMinC,
        threshold: thresholds.temperatureLow,
        rawForecastData: day as unknown as Record<string, unknown>,
      })
    }

    // Temperatura alta
    if (day.temperatureMaxC > thresholds.temperatureHigh) {
      alerts.push({
        alertType: "TEMPERATURE_HIGH",
        severity: day.temperatureMaxC > 40 ? "HIGH" : "MEDIUM",
        description: `Previsión de calor extremo: máx. ${day.temperatureMaxC}°C, mín. ${day.temperatureMinC}°C.`,
        forecastDate: new Date(day.date),
        precipitationMm: null,
        windSpeedKmh: null,
        temperatureC: day.temperatureMaxC,
        threshold: thresholds.temperatureHigh,
        rawForecastData: day as unknown as Record<string, unknown>,
      })
    }
  }

  return alerts
}

// --- Consulta multi-sede ---

export interface CityForecastResult {
  city: string
  source: "AEMET" | "OPENWEATHERMAP" | "NONE"
  days: WeatherForecastDay[]
  alertsGenerated: number
}

export interface WeatherCheckResult {
  forecasts: CityForecastResult[]
  totalAlertsCreated: number
}

/**
 * Consulta AEMET/OWM para todas las ubicaciones, evalúa umbrales y crea alertas.
 * Lee la configuración (umbrales + franja horaria) de la BD.
 * Reutilizada por la server action (UI) y el route handler (cron).
 */
export async function checkAllLocationsWeather(
  locations: Array<{ city: string; aemetMunicipioId: string; latitude: number; longitude: number }>,
  prismaClient: {
    weatherAlert: {
      findFirst: (args: any) => Promise<any>
      create: (args: any) => Promise<any>
    }
    weatherConfig: {
      findUnique: (args: any) => Promise<any>
    }
  }
): Promise<WeatherCheckResult> {
  // Leer configuración de la BD (o defaults)
  const config = await prismaClient.weatherConfig.findUnique({ where: { id: "default" } })
  const thresholds: WeatherThresholds = {
    rainProbability: config?.rainProbability ?? 50,
    rainMm: config?.rainMm ?? 5,
    windSpeed: config?.windSpeed ?? 40,
    windGust: config?.windGust ?? 60,
    temperatureLow: config?.temperatureLow ?? 8,
    temperatureHigh: config?.temperatureHigh ?? 36,
  }
  const serviceStart = config?.serviceHoursStart ?? 12
  const serviceEnd = config?.serviceHoursEnd ?? 0

  // Agrupar por municipio AEMET (evitar llamadas duplicadas para misma ciudad)
  const byMunicipio = new Map<string, { city: string; lat: string; lon: string }>()
  for (const loc of locations) {
    if (!byMunicipio.has(loc.aemetMunicipioId)) {
      byMunicipio.set(loc.aemetMunicipioId, {
        city: loc.city,
        lat: String(loc.latitude),
        lon: String(loc.longitude),
      })
    }
  }

  const forecasts: CityForecastResult[] = []
  let totalAlertsCreated = 0

  for (const [municipioId, { city, lat, lon }] of byMunicipio) {
    // Intentar API horaria primero (temperaturas filtradas por franja de servicio)
    let forecast = await fetchAemetHourlyForecast(municipioId, serviceStart, serviceEnd)
    let source: "AEMET" | "OPENWEATHERMAP" | "NONE" = "AEMET"

    // Fallback a diaria si la horaria no devuelve datos
    if (forecast.length === 0) {
      forecast = await fetchAemetForecast(municipioId)
    }

    // Fallback a OpenWeatherMap
    if (forecast.length === 0) {
      forecast = await fetchOpenWeatherForecast(lat, lon, serviceStart, serviceEnd)
      source = "OPENWEATHERMAP"
    }

    if (forecast.length === 0) {
      forecasts.push({ city, source: "NONE", days: [], alertsGenerated: 0 })
      continue
    }

    const potentialAlerts = evaluateThresholds(forecast, thresholds)
    let cityCreated = 0

    for (const alert of potentialAlerts) {
      const existing = await prismaClient.weatherAlert.findFirst({
        where: {
          alertType: alert.alertType,
          forecastDate: alert.forecastDate,
          location: city,
          status: { in: ["ACTIVE", "MONITORING"] },
        },
      })

      if (!existing) {
        await prismaClient.weatherAlert.create({
          data: {
            alertType: alert.alertType,
            severity: alert.severity,
            description: alert.description,
            forecastDate: alert.forecastDate,
            location: city,
            precipitationMm: alert.precipitationMm,
            windSpeedKmh: alert.windSpeedKmh,
            temperatureC: alert.temperatureC,
            threshold: alert.threshold,
            rawForecastData: alert.rawForecastData as unknown as Record<string, string>,
            source,
            isActive: true,
            triggeredAt: new Date(),
          },
        })
        cityCreated++
        totalAlertsCreated++
      }
    }

    forecasts.push({ city, source, days: forecast, alertsGenerated: cityCreated })
  }

  return { forecasts, totalAlertsCreated }
}
