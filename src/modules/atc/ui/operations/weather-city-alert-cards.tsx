"use client"

import { Card } from "@/modules/shared/ui/card"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { MapPin, AlertTriangle, ShieldAlert, Snowflake, CloudRain, Eye } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { WeatherAlertSeverity, WeatherAlertType } from "@prisma/client"
import { Button } from "@/modules/shared/ui/button"
import type { CityGroup } from "./weather-alerts-dashboard"

const SEVERITY_ORDER: Record<WeatherAlertSeverity, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
}

const SEVERITY_LABELS: Record<WeatherAlertSeverity, string> = {
  LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Crítica",
}

const TYPE_LABELS: Record<WeatherAlertType, string> = {
  RAIN: "Lluvia", WIND: "Viento", TEMPERATURE_HIGH: "Calor",
  TEMPERATURE_LOW: "Frío", STORM: "Tormenta", SNOW: "Nieve",
  HAIL: "Granizo", FOG: "Niebla",
}

function getSeverityConfig(severity: WeatherAlertSeverity) {
  switch (severity) {
    case "CRITICAL":
      return {
        color: "text-red-400",
        bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(239,68,68,0.15)_0%,_transparent_50%)]",
        border: "border-red-500/30",
        chartColor: "hsl(0, 84%, 60%)",
        barColors: { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-blue-500" },
      }
    case "HIGH":
      return {
        color: "text-orange-400",
        bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(249,115,22,0.15)_0%,_transparent_50%)]",
        border: "border-orange-500/30",
        chartColor: "hsl(25, 93%, 55%)",
        barColors: { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-blue-500" },
      }
    case "MEDIUM":
      return {
        color: "text-amber-400",
        bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(245,158,11,0.15)_0%,_transparent_50%)]",
        border: "border-amber-500/30",
        chartColor: "hsl(45, 93%, 55%)",
        barColors: { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-blue-500" },
      }
    default:
      return {
        color: "text-blue-400",
        bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.15)_0%,_transparent_50%)]",
        border: "border-blue-500/30",
        chartColor: "hsl(210, 89%, 55%)",
        barColors: { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-blue-500" },
      }
  }
}

function SeverityBar({ alerts }: { alerts: CityGroup["alerts"] }) {
  const total = alerts.length
  if (total === 0) return null

  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  for (const a of alerts) counts[a.severity]++

  return (
    <div className="h-1.5 w-full rounded-full bg-secondary/30 overflow-hidden flex">
      {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(sev => {
        const pct = (counts[sev] / total) * 100
        if (pct === 0) return null
        const colors = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-blue-500" }
        return (
          <div
            key={sev}
            className={cn("h-full transition-all duration-700 ease-out", colors[sev])}
            style={{ width: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}

function MiniSparkline({ group, config }: { group: CityGroup; config: ReturnType<typeof getSeverityConfig> }) {
  // Agrupar por fecha de previsión → severidad máxima por fecha
  const dateMap = new Map<string, number>()
  for (const alert of group.alerts) {
    const dateKey = new Date(alert.forecastDate).toISOString().split("T")[0]
    const current = dateMap.get(dateKey) ?? 0
    dateMap.set(dateKey, Math.max(current, SEVERITY_ORDER[alert.severity]))
  }

  const data = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, severity]) => ({ date, severity }))

  if (data.length < 2) return null

  const gradientId = `sparkline-${group.city.replace(/\s+/g, "-")}`

  return (
    <div className="w-full h-[50px] mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.chartColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={config.chartColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="severity"
            stroke={config.chartColor}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CityAlertCard({
  group,
  isSelected,
  onSelect,
}: {
  group: CityGroup
  isSelected: boolean
  onSelect: () => void
}) {
  const t = useTranslations("atc")
  const config = getSeverityConfig(group.maxSeverity)

  const severityBadgeColors: Record<WeatherAlertSeverity, string> = {
    LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer",
        "border border-border/40 hover:border-primary/40",
        "bg-card/60 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-xl",
        isSelected && "border-primary ring-1 ring-primary/20",
      )}
      onClick={onSelect}
    >
      <div className={cn(
        "absolute inset-0 opacity-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500",
        config.bg,
      )} />

      <div className="relative p-4 flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">
              {group.city}
            </h3>
          </div>
          <div className={cn(
            "p-1.5 rounded-lg border transition-all duration-300",
            "bg-background/50",
            config.border,
            "group-hover:scale-110",
          )}>
            {group.maxSeverity === "CRITICAL" ? (
              <ShieldAlert className={cn("h-4 w-4", config.color)} />
            ) : group.activeCount > 0 ? (
              <AlertTriangle className={cn("h-4 w-4", config.color)} />
            ) : (
              <Snowflake className={cn("h-4 w-4", config.color)} />
            )}
          </div>
        </div>

        {/* Métrica principal */}
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-3xl font-black tabular-nums tracking-tight", config.color)}>
            {group.activeCount}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{t("totalActiveAlerts").toLowerCase()}</span>
        </div>

        {/* Barra de severidad */}
        <SeverityBar alerts={group.alerts} />

        {/* Badges: severidad + tipos */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", severityBadgeColors[group.maxSeverity])}>
            {SEVERITY_LABELS[group.maxSeverity]}
          </span>
          {group.alertTypes.slice(0, 3).map(type => (
            <span key={type} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
              {TYPE_LABELS[type]}
            </span>
          ))}
        </div>

        {/* Fechas */}
        <div className="flex flex-wrap gap-1">
          {group.forecastDates.slice(0, 4).map(date => (
            <span key={date} className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              {date}
            </span>
          ))}
          {group.forecastDates.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{group.forecastDates.length - 4}</span>
          )}
        </div>

        {/* Sparkline */}
        <MiniSparkline group={group} config={config} />

        {/* Botón ver detalle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 text-xs cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onSelect() }}
        >
          <Eye className="mr-1.5 h-3 w-3" />
          {t("viewDetail")}
        </Button>
      </div>
    </Card>
  )
}

interface WeatherCityAlertCardsProps {
  groups: CityGroup[]
  selectedCity: string | null
  onSelectCity: (city: string) => void
}

export function WeatherCityAlertCards({ groups, selectedCity, onSelectCity }: WeatherCityAlertCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(group => (
        <CityAlertCard
          key={group.city}
          group={group}
          isSelected={selectedCity === group.city}
          onSelect={() => onSelectCity(group.city)}
        />
      ))}
    </div>
  )
}
