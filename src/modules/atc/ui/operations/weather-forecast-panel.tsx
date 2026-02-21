"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/modules/shared/ui/card"
import { Button } from "@/modules/shared/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import {
  RefreshCw,
  CloudRain,
  Wind,
  Thermometer,
  CloudSun,
  AlertTriangle,
  CheckCircle,
  MapPin,
} from "lucide-react"
import { checkWeatherNow } from "@/modules/atc/actions/operations"
import type { CityForecastResult, WeatherForecastDay } from "@/lib/weather"

function getWeatherIcon(day: WeatherForecastDay) {
  if (day.precipitationProbability > 50 || day.precipitationMm > 5) return CloudRain
  if (day.windSpeedKmh > 40 || day.windGustKmh > 60) return Wind
  if (day.temperatureMaxC > 36 || day.temperatureMinC < 8) return Thermometer
  return CloudSun
}

function getCityConfig(forecast: CityForecastResult) {
  if (forecast.source === "NONE") return {
    color: "text-gray-400",
    bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(156,163,175,0.15)_0%,_transparent_50%)]",
    border: "border-gray-500/30",
    glow: "shadow-gray-500/10",
  }
  if (forecast.alertsGenerated > 0) return {
    color: "text-amber-400",
    bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(245,158,11,0.15)_0%,_transparent_50%)]",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10",
  }
  return {
    color: "text-emerald-400",
    bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.15)_0%,_transparent_50%)]",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
  }
}

function ForecastDayRow({ day }: { day: WeatherForecastDay }) {
  const Icon = getWeatherIcon(day)
  const dateLabel = new Date(day.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{dateLabel}</span>
      </div>
      <div className="flex items-center gap-3 text-xs tabular-nums">
        <span className="text-foreground font-medium">
          {Math.round(day.temperatureMinC)}° — {Math.round(day.temperatureMaxC)}°
        </span>
        {day.precipitationProbability > 0 && (
          <span className="text-blue-500">{day.precipitationProbability}%</span>
        )}
        {day.windGustKmh > 30 && (
          <span className="text-amber-500">{Math.round(day.windGustKmh)} km/h</span>
        )}
      </div>
    </div>
  )
}

function CityCard({ forecast }: { forecast: CityForecastResult }) {
  const t = useTranslations("atc")
  const config = getCityConfig(forecast)
  const today = forecast.days[0]

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border border-border/40 hover:border-primary/40",
      "bg-card/60 backdrop-blur-sm",
      "transition-all duration-300 ease-out",
      "hover:scale-[1.02] hover:shadow-xl",
    )}>
      <div className={cn(
        "absolute inset-0 opacity-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500",
        config.bg,
      )} />

      <div className="relative p-5 flex flex-col gap-3">
        {/* Header: Ciudad + Estado */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-bold leading-tight group-hover:text-primary transition-colors">
              {forecast.city}
            </h3>
          </div>
          <div className={cn(
            "p-1.5 rounded-lg border transition-all duration-300",
            "bg-background/50",
            config.border,
            "group-hover:scale-110",
          )}>
            {forecast.alertsGenerated > 0 ? (
              <AlertTriangle className={cn("h-4 w-4", config.color)} />
            ) : forecast.source === "NONE" ? (
              <CloudSun className="h-4 w-4 text-gray-400" />
            ) : (
              <CheckCircle className={cn("h-4 w-4", config.color)} />
            )}
          </div>
        </div>

        {/* Temperatura principal */}
        {today ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-3xl font-black tabular-nums tracking-tight", config.color)}>
                {Math.round(today.temperatureMinC)}° — {Math.round(today.temperatureMaxC)}°
              </span>
            </div>

            {/* Métricas secundarias */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CloudRain className="h-3 w-3" />
                <span>{today.precipitationProbability}%</span>
                {today.precipitationMm > 0 && <span>({today.precipitationMm}mm)</span>}
              </div>
              <div className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                <span>{Math.round(today.windGustKmh)} km/h</span>
              </div>
            </div>

            {/* Badge de alertas */}
            {forecast.alertsGenerated > 0 && (
              <span className="inline-flex items-center self-start rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {forecast.alertsGenerated} {t("alertsGenerated")}
              </span>
            )}

            {/* Días de previsión */}
            <div className="mt-1">
              {forecast.days.map((day) => (
                <ForecastDayRow key={day.date} day={day} />
              ))}
            </div>

            {/* Fuente */}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {forecast.source}
            </span>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4">{t("noForecastData")}</p>
        )}
      </div>
    </Card>
  )
}

export function WeatherForecastPanel() {
  const t = useTranslations("atc")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [forecasts, setForecasts] = useState<CityForecastResult[] | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  async function handleCheck() {
    setLoading(true)
    try {
      const result = await checkWeatherNow()
      if (result.success && result.data) {
        setForecasts(result.data.forecasts)
        setLastChecked(new Date())
        router.refresh()
        if (result.data.totalAlertsCreated > 0) {
          toast.success(`${result.data.totalAlertsCreated} ${t("alertsGenerated")}`)
        } else {
          toast.success(t("forecastUpdated"))
        }
      } else {
        toast.error(result.error ?? "Error")
      }
    } catch {
      toast.error("Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header: Botón + timestamp */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{t("weatherForecast")}</h3>
          {lastChecked && (
            <p className="text-xs text-muted-foreground">
              {t("lastChecked")}: {lastChecked.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <Button
          onClick={handleCheck}
          disabled={loading}
          size="sm"
          variant="outline"
          className="cursor-pointer"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          {loading ? t("checkingForecast") : t("checkForecast")}
        </Button>
      </div>

      {/* Grid de cards por ciudad */}
      {forecasts && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {forecasts.map((f) => (
            <CityCard key={f.city} forecast={f} />
          ))}
        </div>
      )}
    </div>
  )
}
