import { describe, it, expect } from "vitest"
import { evaluateThresholds, DEFAULT_THRESHOLDS } from "@/lib/weather"
import type { WeatherForecastDay, WeatherThresholds } from "@/lib/weather"

// --- Helper para crear un día de pronóstico con valores por defecto seguros ---
function makeDay(overrides: Partial<WeatherForecastDay> = {}): WeatherForecastDay {
  return {
    date: "2026-02-22",
    precipitationMm: 0,
    precipitationProbability: 0,
    windSpeedKmh: 0,
    windGustKmh: 0,
    temperatureMinC: 20,
    temperatureMaxC: 25,
    description: "Soleado",
    ...overrides,
  }
}

// ==================== Casos base ====================
describe("evaluateThresholds", () => {
  it("pronóstico vacío → retorna []", () => {
    const result = evaluateThresholds([])
    expect(result).toEqual([])
  })

  // ==================== Lluvia ====================
  describe("RAIN", () => {
    it("prob > 50 → genera alerta RAIN con severity MEDIUM (exceedances=0, +1=1)", () => {
      const day = makeDay({ precipitationProbability: 60, precipitationMm: 0 })
      const alerts = evaluateThresholds([day])
      expect(alerts).toHaveLength(1)
      expect(alerts[0].alertType).toBe("RAIN")
      expect(alerts[0].severity).toBe("MEDIUM")
    })

    it("prob > 70 Y mm > 15 → severity CRITICAL (exceedances=2, +1=3)", () => {
      const day = makeDay({ precipitationProbability: 80, precipitationMm: 20 })
      const alerts = evaluateThresholds([day])
      const rainAlert = alerts.find(a => a.alertType === "RAIN")
      expect(rainAlert).toBeDefined()
      expect(rainAlert!.severity).toBe("CRITICAL")
    })

    it("prob <= 50 Y mm <= 5 → NO genera alerta RAIN", () => {
      const day = makeDay({ precipitationProbability: 50, precipitationMm: 5 })
      const alerts = evaluateThresholds([day])
      expect(alerts.find(a => a.alertType === "RAIN")).toBeUndefined()
    })

    it("solo mm > 5 (prob <= 50) → genera alerta RAIN con severity MEDIUM", () => {
      const day = makeDay({ precipitationProbability: 30, precipitationMm: 10 })
      const alerts = evaluateThresholds([day])
      const rainAlert = alerts.find(a => a.alertType === "RAIN")
      expect(rainAlert).toBeDefined()
      expect(rainAlert!.severity).toBe("MEDIUM")
    })
  })

  // ==================== Viento ====================
  describe("WIND", () => {
    it("windSpeedKmh > 40 → genera WIND con severity MEDIUM (gust<=60, exceedances=0, +1=1)", () => {
      const day = makeDay({ windSpeedKmh: 50, windGustKmh: 55 })
      const alerts = evaluateThresholds([day])
      const windAlert = alerts.find(a => a.alertType === "WIND")
      expect(windAlert).toBeDefined()
      expect(windAlert!.severity).toBe("MEDIUM")
    })

    it("gustKmh > 80 → severity CRITICAL (exceedances=2, +1=3)", () => {
      const day = makeDay({ windSpeedKmh: 50, windGustKmh: 90 })
      const alerts = evaluateThresholds([day])
      const windAlert = alerts.find(a => a.alertType === "WIND")
      expect(windAlert).toBeDefined()
      expect(windAlert!.severity).toBe("CRITICAL")
    })

    it("windSpeedKmh <= 40 Y windGustKmh <= 60 → NO genera alerta WIND", () => {
      const day = makeDay({ windSpeedKmh: 40, windGustKmh: 60 })
      const alerts = evaluateThresholds([day])
      expect(alerts.find(a => a.alertType === "WIND")).toBeUndefined()
    })

    it("solo gustKmh > 60 (speed<=40) → genera WIND con severity HIGH (exceedances=1, +1=2)", () => {
      const day = makeDay({ windSpeedKmh: 30, windGustKmh: 70 })
      const alerts = evaluateThresholds([day])
      const windAlert = alerts.find(a => a.alertType === "WIND")
      expect(windAlert).toBeDefined()
      expect(windAlert!.severity).toBe("HIGH")
    })
  })

  // ==================== Temperatura baja ====================
  describe("TEMPERATURE_LOW", () => {
    it("minC < 8 → TEMPERATURE_LOW con severity MEDIUM", () => {
      const day = makeDay({ temperatureMinC: 5 })
      const alerts = evaluateThresholds([day])
      const alert = alerts.find(a => a.alertType === "TEMPERATURE_LOW")
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe("MEDIUM")
    })

    it("minC < 3 → TEMPERATURE_LOW con severity HIGH", () => {
      const day = makeDay({ temperatureMinC: 1 })
      const alerts = evaluateThresholds([day])
      const alert = alerts.find(a => a.alertType === "TEMPERATURE_LOW")
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe("HIGH")
    })

    it("minC >= 8 → NO genera alerta TEMPERATURE_LOW", () => {
      const day = makeDay({ temperatureMinC: 8 })
      const alerts = evaluateThresholds([day])
      expect(alerts.find(a => a.alertType === "TEMPERATURE_LOW")).toBeUndefined()
    })
  })

  // ==================== Temperatura alta ====================
  describe("TEMPERATURE_HIGH", () => {
    it("maxC > 36 → TEMPERATURE_HIGH con severity MEDIUM", () => {
      const day = makeDay({ temperatureMaxC: 38 })
      const alerts = evaluateThresholds([day])
      const alert = alerts.find(a => a.alertType === "TEMPERATURE_HIGH")
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe("MEDIUM")
    })

    it("maxC > 40 → TEMPERATURE_HIGH con severity HIGH", () => {
      const day = makeDay({ temperatureMaxC: 42 })
      const alerts = evaluateThresholds([day])
      const alert = alerts.find(a => a.alertType === "TEMPERATURE_HIGH")
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe("HIGH")
    })

    it("maxC <= 36 → NO genera alerta TEMPERATURE_HIGH", () => {
      const day = makeDay({ temperatureMaxC: 36 })
      const alerts = evaluateThresholds([day])
      expect(alerts.find(a => a.alertType === "TEMPERATURE_HIGH")).toBeUndefined()
    })
  })

  // ==================== Múltiples alertas ====================
  describe("múltiples alertas", () => {
    it("lluvia + viento en un mismo día → 2 alertas", () => {
      const day = makeDay({
        precipitationProbability: 60,
        precipitationMm: 0,
        windSpeedKmh: 50,
        windGustKmh: 55,
      })
      const alerts = evaluateThresholds([day])
      expect(alerts).toHaveLength(2)
      expect(alerts.find(a => a.alertType === "RAIN")).toBeDefined()
      expect(alerts.find(a => a.alertType === "WIND")).toBeDefined()
    })

    it("2 días con lluvia → 2 alertas (una por día)", () => {
      const day1 = makeDay({ date: "2026-02-22", precipitationProbability: 60 })
      const day2 = makeDay({ date: "2026-02-23", precipitationProbability: 70 })
      const alerts = evaluateThresholds([day1, day2])
      const rainAlerts = alerts.filter(a => a.alertType === "RAIN")
      expect(rainAlerts).toHaveLength(2)
    })
  })

  // ==================== Umbrales personalizados ====================
  describe("umbrales personalizados", () => {
    it("thresholds con windSpeed=100 → viento a 50km/h NO genera alerta", () => {
      const customThresholds: WeatherThresholds = {
        ...DEFAULT_THRESHOLDS,
        windSpeed: 100,
        windGust: 150,
      }
      const day = makeDay({ windSpeedKmh: 50, windGustKmh: 55 })
      const alerts = evaluateThresholds([day], customThresholds)
      expect(alerts.find(a => a.alertType === "WIND")).toBeUndefined()
    })
  })

  // ==================== forecastDate como instancia de Date ====================
  describe("forecastDate", () => {
    it("forecastDate se convierte a Date object desde day.date", () => {
      const day = makeDay({ date: "2026-02-22", precipitationProbability: 60 })
      const alerts = evaluateThresholds([day])
      expect(alerts).toHaveLength(1)
      expect(alerts[0].forecastDate).toBeInstanceOf(Date)
      expect(alerts[0].forecastDate.toISOString().startsWith("2026-02-22")).toBe(true)
    })
  })
})
