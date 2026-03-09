"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { EmailKpiCards } from "./email-kpi-cards"
import { UnreadByCategoryPanel } from "./unread-by-category-table"
import { EmailVolumeChart } from "./email-volume-chart"
import { IncidentsSummaryCard } from "./incidents-summary-card"
import { QueriesSummaryCard } from "./queries-summary-card"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getUnreadByCategory,
  getEmailKpis,
  getIncidentSummary,
  getQuerySummary,
  getEmailVolumeByDay,
  type UnreadByCategoryItem,
  type EmailKpis,
  type IncidentSummaryItem,
  type QuerySummaryData,
  type EmailVolumePoint,
} from "@/modules/atc/actions/atc-analytics"

const AUTO_REFRESH_MS = 60_000

export function AtcAnalyticsDashboard() {
  const [unreadByCategory, setUnreadByCategory] = useState<UnreadByCategoryItem[]>([])
  const [emailKpis, setEmailKpis] = useState<EmailKpis | null>(null)
  const [incidents, setIncidents] = useState<IncidentSummaryItem[]>([])
  const [queries, setQueries] = useState<QuerySummaryData | null>(null)
  const [volume, setVolume] = useState<EmailVolumePoint[]>([])
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const [ubc, kpis, inc, q, vol] = await Promise.all([
        getUnreadByCategory(),
        getEmailKpis(),
        getIncidentSummary(),
        getQuerySummary(),
        getEmailVolumeByDay(14),
      ])
      if (ubc.data) setUnreadByCategory(ubc.data)
      if (kpis.data) setEmailKpis(kpis.data)
      if (inc.data) setIncidents(inc.data)
      if (q.data) setQueries(q.data)
      if (vol.data) setVolume(vol.data)
    })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const interval = setInterval(fetchData, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {/* Status indicator */}
      <div className="flex items-center justify-end">
        <button
          onClick={fetchData}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          {isPending ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* KPI Cards */}
      <EmailKpiCards data={emailKpis} isPending={isPending} />

      {/* Pieza central: Emails no leídos por categoría */}
      <UnreadByCategoryPanel data={unreadByCategory} isPending={isPending} />

      {/* Secondary: Volume + Incidents + Queries */}
      <div className="grid gap-6 lg:grid-cols-3">
        <EmailVolumeChart data={volume} isPending={isPending} />
        <IncidentsSummaryCard data={incidents} isPending={isPending} />
        <QueriesSummaryCard data={queries} isPending={isPending} />
      </div>
    </div>
  )
}
