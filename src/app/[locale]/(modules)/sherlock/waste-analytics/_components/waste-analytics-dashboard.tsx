"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { format, subYears } from "date-fns"
import { useTranslations } from "next-intl"
import { AnalyticsFilters, type FilterState } from "@/app/[locale]/(modules)/analytics/covers/_components/analytics-filters"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Trash2,
  DollarSign,
  Hash,
  Scale,
} from "lucide-react"
import {
  getWasteKpis,
  getWasteTrend,
  getWasteByReason,
  getWasteByIngredient,
  type WasteKpiData,
  type WasteTrendPoint,
  type WasteByReasonPoint,
  type WasteByIngredientPoint,
} from "@/modules/sherlock/actions/waste-analytics"

const REASON_COLORS: Record<string, string> = {
  EXPIRED: "hsl(0 84% 60%)",
  BURNED: "hsl(25 95% 53%)",
  SPOILED: "hsl(45 93% 47%)",
  QUALITY_ISSUE: "hsl(262 83% 58%)",
  OVERPRODUCTION: "hsl(221 83% 53%)",
  YIELD_LOSS: "hsl(172 66% 50%)",
  OTHER: "hsl(215 14% 60%)",
}

interface Props {
  locations: { id: string; name: string; city: string; cmSlug: string | null }[]
}

export function WasteAnalyticsDashboard({ locations }: Props) {
  const t = useTranslations("sherlock.wasteAnalytics")

  const [filters, setFilters] = useState<FilterState>({
    dateStart: format(subYears(new Date(), 1), "yyyy-MM-dd"),
    dateEnd: format(new Date(), "yyyy-MM-dd"),
    locationIds: locations.map((l) => l.id),
    granularity: "month",
  })

  const [kpis, setKpis] = useState<WasteKpiData | null>(null)
  const [trend, setTrend] = useState<WasteTrendPoint[]>([])
  const [byReason, setByReason] = useState<WasteByReasonPoint[]>([])
  const [byIngredient, setByIngredient] = useState<WasteByIngredientPoint[]>([])
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const { locationIds, dateStart, dateEnd } = filters
      const [k, tr, r, i] = await Promise.all([
        getWasteKpis(locationIds, dateStart, dateEnd),
        getWasteTrend(locationIds, dateStart, dateEnd),
        getWasteByReason(locationIds, dateStart, dateEnd),
        getWasteByIngredient(locationIds, dateStart, dateEnd),
      ])
      setKpis(k)
      setTrend(tr)
      setByReason(r)
      setByIngredient(i)
    })
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const kpiCards = [
    {
      title: t("totalCost"),
      value: kpis ? `${kpis.totalCostImpact.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€` : null,
      delta: kpis?.costDelta,
      icon: DollarSign,
      color: "text-red-500",
    },
    {
      title: t("totalQuantity"),
      value: kpis ? kpis.totalQuantity.toLocaleString("es-ES", { maximumFractionDigits: 1 }) : null,
      icon: Scale,
      color: "text-amber-500",
    },
    {
      title: t("totalRecords"),
      value: kpis ? kpis.totalRecords.toString() : null,
      icon: Hash,
      color: "text-blue-500",
    },
    {
      title: t("avgPerRecord"),
      value: kpis ? kpis.avgQuantityPerRecord.toFixed(1) : null,
      icon: Trash2,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      <AnalyticsFilters
        locations={locations}
        filters={filters}
        onChange={setFilters}
        isPending={isPending}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="py-4 gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="px-4">
              {isPending || !kpis ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {card.value}
                  </span>
                  {card.delta != null && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${
                        card.delta > 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {card.delta > 0 ? "▲" : "▼"} {Math.abs(card.delta).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendencia */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("trendTitle")}</CardTitle>
            <CardDescription>{t("trendDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${v.toFixed(0)}€`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "costImpact"
                        ? `${value.toLocaleString("es-ES")}€`
                        : value.toLocaleString("es-ES")
                    }
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="costImpact"
                    name={t("totalCost")}
                    fill="hsl(0 84% 60%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Por motivo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("byReason")}</CardTitle>
            <CardDescription>{t("byReasonDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {byReason.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byReason}
                    dataKey="costImpact"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {byReason.map((entry) => (
                      <Cell
                        key={entry.reason}
                        fill={REASON_COLORS[entry.reason] ?? "hsl(215 14% 60%)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      `${value.toLocaleString("es-ES")}€`
                    }
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top ingredientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("topIngredients")}</CardTitle>
            <CardDescription>{t("topIngredientsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {byIngredient.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                <div className="grid grid-cols-[1fr_70px_70px] gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>{t("ingredient")}</span>
                  <span className="text-right">{t("quantity")}</span>
                  <span className="text-right">{t("cost")}</span>
                </div>
                {byIngredient.map((item) => (
                  <div
                    key={item.ingredientName}
                    className="grid grid-cols-[1fr_70px_70px] gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-sm"
                  >
                    <span className="truncate">{item.ingredientName}</span>
                    <span className="text-right tabular-nums text-xs text-muted-foreground">
                      {item.quantity} {item.unitAbbreviation}
                    </span>
                    <span className="text-right tabular-nums text-xs font-medium text-red-600">
                      {item.costImpact.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
