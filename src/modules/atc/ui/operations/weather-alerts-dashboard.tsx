"use client"

import { useMemo, useState, useRef } from "react"
import { Card } from "@/modules/shared/ui/card"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { AlertTriangle, MapPin, ShieldAlert, Calendar, CheckCircle } from "lucide-react"
import {
  WeatherAlertType,
  WeatherAlertSeverity,
  WeatherAlertStatus,
} from "@prisma/client"
import { WeatherAlertsSeverityChart } from "./weather-alerts-chart"
import { WeatherCityAlertCards } from "./weather-city-alert-cards"
import { WeatherAlertsTable } from "./weather-alerts-table"

export type WeatherAlertRow = {
  id: string
  alertType: WeatherAlertType
  severity: WeatherAlertSeverity
  status: WeatherAlertStatus
  description: string
  location: string
  forecastDate: Date
  precipitationMm: number | null
  windSpeedKmh: number | null
  temperatureC: number | null
  actionsTaken: string | null
  resolvedBy: string | null
  createdAt: Date
}

export type CityGroup = {
  city: string
  alerts: WeatherAlertRow[]
  activeCount: number
  maxSeverity: WeatherAlertSeverity
  alertTypes: WeatherAlertType[]
  forecastDates: string[]
}

type AlertsSummary = {
  total: number
  active: number
  bySeverity: Record<WeatherAlertSeverity, number>
  citiesAffected: number
  nextForecastDate: Date | null
}

const SEVERITY_ORDER: Record<WeatherAlertSeverity, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
}

function groupAlertsByCity(alerts: WeatherAlertRow[]): CityGroup[] {
  const map = new Map<string, WeatherAlertRow[]>()
  for (const alert of alerts) {
    const existing = map.get(alert.location) ?? []
    existing.push(alert)
    map.set(alert.location, existing)
  }

  return Array.from(map.entries())
    .map(([city, cityAlerts]) => {
      const activeAlerts = cityAlerts.filter(a => a.status === "ACTIVE" || a.status === "MONITORING")
      const types = [...new Set(cityAlerts.map(a => a.alertType))]
      const dates = [...new Set(cityAlerts.map(a =>
        new Date(a.forecastDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
      ))]
      const maxSev = cityAlerts.reduce((max, a) =>
        SEVERITY_ORDER[a.severity] > SEVERITY_ORDER[max] ? a.severity : max,
        "LOW" as WeatherAlertSeverity
      )
      return {
        city,
        alerts: cityAlerts,
        activeCount: activeAlerts.length,
        maxSeverity: maxSev,
        alertTypes: types,
        forecastDates: dates,
      }
    })
    .sort((a, b) => SEVERITY_ORDER[b.maxSeverity] - SEVERITY_ORDER[a.maxSeverity])
}

function computeSummary(alerts: WeatherAlertRow[]): AlertsSummary {
  const active = alerts.filter(a => a.status === "ACTIVE" || a.status === "MONITORING")
  const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  for (const a of alerts) bySeverity[a.severity]++
  const cities = new Set(alerts.map(a => a.location))

  const futureDates = alerts
    .map(a => new Date(a.forecastDate))
    .filter(d => d >= new Date(new Date().toDateString()))
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    total: alerts.length,
    active: active.length,
    bySeverity,
    citiesAffected: cities.size,
    nextForecastDate: futureDates[0] ?? null,
  }
}

// --- Summary Bar ---

function SummaryBar({ summary }: { summary: AlertsSummary }) {
  const t = useTranslations("atc")
  const criticalCount = summary.bySeverity.CRITICAL + summary.bySeverity.HIGH

  const kpis = [
    {
      label: t("totalActiveAlerts"),
      value: summary.active,
      icon: AlertTriangle,
      color: summary.active > 0
        ? (summary.bySeverity.CRITICAL > 0 ? "text-red-400" : "text-amber-400")
        : "text-emerald-400",
    },
    {
      label: t("citiesAffected"),
      value: summary.citiesAffected,
      icon: MapPin,
      color: "text-blue-400",
    },
    {
      label: t("criticalAlerts"),
      value: criticalCount,
      icon: ShieldAlert,
      color: criticalCount > 0 ? "text-red-400" : "text-muted-foreground",
    },
    {
      label: t("nextForecast"),
      value: summary.nextForecastDate
        ? summary.nextForecastDate.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
        : "—",
      icon: Calendar,
      color: "text-muted-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="bg-card/60 backdrop-blur-sm border-border/40 p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-background/50 border border-border/40", kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div>
              <div className={cn("text-2xl font-black tabular-nums tracking-tight", typeof kpi.value === "number" && kpi.color)}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {kpi.label}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// --- Dashboard ---

interface WeatherAlertsDashboardProps {
  data: WeatherAlertRow[]
  isSuperAdmin?: boolean
}

export function WeatherAlertsDashboard({ data, isSuperAdmin = false }: WeatherAlertsDashboardProps) {
  const t = useTranslations("atc")
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupAlertsByCity(data), [data])
  const summary = useMemo(() => computeSummary(data), [data])

  const chartData = useMemo(() =>
    groups.map(g => ({
      city: g.city,
      LOW: g.alerts.filter(a => a.severity === "LOW").length,
      MEDIUM: g.alerts.filter(a => a.severity === "MEDIUM").length,
      HIGH: g.alerts.filter(a => a.severity === "HIGH").length,
      CRITICAL: g.alerts.filter(a => a.severity === "CRITICAL").length,
    })),
    [groups]
  )

  function handleSelectCity(city: string) {
    setSelectedCity(prev => prev === city ? null : city)
    // Scroll suave a la tabla
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-border/40 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t("noActiveAlerts")}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryBar summary={summary} />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <WeatherAlertsSeverityChart
            chartData={chartData}
            onSelectCity={handleSelectCity}
            selectedCity={selectedCity}
          />
        </div>
        <div className="lg:col-span-3">
          <WeatherCityAlertCards
            groups={groups}
            selectedCity={selectedCity}
            onSelectCity={handleSelectCity}
          />
        </div>
      </div>

      <div ref={tableRef}>
        <WeatherAlertsTable
          data={data}
          selectedCity={selectedCity}
          onClearFilter={() => setSelectedCity(null)}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  )
}
