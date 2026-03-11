"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { format, subMonths, subYears } from "date-fns"
import { AnalyticsFilters, type FilterState } from "./analytics-filters"
import { KpiCards } from "./kpi-cards"
import { CoversTrendChart } from "./covers-trend-chart"
import { LocationComparisonChart } from "./location-comparison-chart"
import { WeekdayDistributionChart } from "./weekday-distribution-chart"
import { HourlyHeatmap } from "./hourly-heatmap"
import { SyncStatusInline } from "./sync-status-card"
import {
  getAnalyticsKpis,
  getCoversTrend,
  getLocationComparison,
  getWeekdayDistribution,
  getServiceSplit,
  type KpiData,
  type TrendDataPoint,
  type LocationComparisonPoint,
  type WeekdayDistribution,
} from "@/modules/analytics/actions/cover-analytics"

interface Props {
  locations: { id: string; name: string; city: string; cmSlug: string | null }[]
}

export function AnalyticsDashboard({ locations }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    dateStart: format(subYears(new Date(), 1), "yyyy-MM-dd"),
    dateEnd: format(new Date(), "yyyy-MM-dd"),
    locationIds: locations.map((l) => l.id),
    granularity: "month",
  })

  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [trend, setTrend] = useState<TrendDataPoint[]>([])
  const [comparison, setComparison] = useState<LocationComparisonPoint[]>([])
  const [weekday, setWeekday] = useState<WeekdayDistribution[]>([])
  const [serviceSplit, setServiceSplit] = useState<{
    lunch: number
    dinner: number
    walkin: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const { locationIds, dateStart, dateEnd, granularity } = filters
      if (locationIds.length === 0) return

      const [k, t, c, w, s] = await Promise.all([
        getAnalyticsKpis(locationIds, dateStart, dateEnd),
        getCoversTrend(locationIds, dateStart, dateEnd, granularity),
        getLocationComparison(locationIds, dateStart, dateEnd, granularity),
        getWeekdayDistribution(locationIds, dateStart, dateEnd),
        getServiceSplit(locationIds, dateStart, dateEnd),
      ])
      setKpis(k)
      setTrend(t)
      setComparison(c)
      setWeekday(w)
      setServiceSplit(s)
    })
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {/* Filtros + Sync */}
      <AnalyticsFilters
        locations={locations}
        filters={filters}
        onChange={setFilters}
        isPending={isPending}
        trailing={<SyncStatusInline />}
      />

      {/* KPIs */}
      <KpiCards data={kpis} isPending={isPending} />

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CoversTrendChart
          data={trend}
          granularity={filters.granularity}
          className="lg:col-span-2"
        />
        <LocationComparisonChart
          data={comparison}
          locations={locations.filter((l) =>
            filters.locationIds.includes(l.id)
          )}
        />
        <WeekdayDistributionChart data={weekday} />
      </div>

      {/* Heatmap servicio */}
      <HourlyHeatmap serviceSplit={serviceSplit} isPending={isPending} />
    </div>
  )
}
