"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { format, subYears } from "date-fns"
import { AnalyticsFilters, type FilterState } from "@/app/[locale]/(modules)/analytics/covers/_components/analytics-filters"
import { FoodCostKpiCards } from "./food-cost-kpi-cards"
import { FoodCostTrendChart } from "./food-cost-trend-chart"
import { CategoryCostChart } from "./category-cost-chart"
import { LocationCostTable } from "./location-cost-table"
import {
  getFoodCostKpis,
  getFoodCostTrend,
  getFoodCostByCategory,
  getFoodCostByLocation,
  type FoodCostKpiData,
  type FoodCostTrendPoint,
  type CategoryCostPoint,
  type VarianceItemPoint,
} from "@/modules/sherlock/actions/food-cost-analytics"

interface Props {
  locations: { id: string; name: string; city: string; cmSlug: string | null }[]
}

export function FoodCostDashboard({ locations }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    dateStart: format(subYears(new Date(), 1), "yyyy-MM-dd"),
    dateEnd: format(new Date(), "yyyy-MM-dd"),
    locationIds: locations.map((l) => l.id),
    granularity: "month",
  })

  const [kpis, setKpis] = useState<FoodCostKpiData | null>(null)
  const [trend, setTrend] = useState<FoodCostTrendPoint[]>([])
  const [categories, setCategories] = useState<CategoryCostPoint[]>([])
  const [byLocation, setByLocation] = useState<VarianceItemPoint[]>([])
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const { locationIds, dateStart, dateEnd, granularity } = filters
      if (locationIds.length === 0) return

      const [k, t, c, l] = await Promise.all([
        getFoodCostKpis(locationIds, dateStart, dateEnd),
        getFoodCostTrend(locationIds, dateStart, dateEnd, granularity),
        getFoodCostByCategory(locationIds, dateStart, dateEnd),
        getFoodCostByLocation(locationIds, dateStart, dateEnd),
      ])
      setKpis(k)
      setTrend(t)
      setCategories(c)
      setByLocation(l)
    })
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      <AnalyticsFilters
        locations={locations}
        filters={filters}
        onChange={setFilters}
        isPending={isPending}
      />

      <FoodCostKpiCards data={kpis} isPending={isPending} />

      <div className="grid gap-6 lg:grid-cols-2">
        <FoodCostTrendChart data={trend} className="lg:col-span-2" />
        <CategoryCostChart data={categories} />
        <LocationCostTable data={byLocation} />
      </div>
    </div>
  )
}
