"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  DollarSign,
  TrendingDown,
  Database,
  Trash2,
  Info,
  ExternalLink,
  CircleAlert,
  CheckCircle2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/ui/alert"
import {
  getSherlockLandingSummary,
  type SherlockLandingSummary,
} from "@/modules/sherlock/actions/sherlock-summary"
import { cn } from "@/lib/utils"

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return value.toFixed(0)
}

export function SherlockSummary() {
  const t = useTranslations("sherlock.summary")
  const [data, setData] = useState<SherlockLandingSummary | null>(null)

  useEffect(() => {
    getSherlockLandingSummary().then(setData)
  }, [])

  if (!data) {
    return (
      <div className="space-y-4">
        {/* Skeleton KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="py-3">
              <CardContent className="px-4">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-7 w-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Skeleton banner */}
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  const kpis = [
    {
      label: t("revenue"),
      value: `${formatCurrency(data.totalRevenue)}€`,
      sub: t("revenueMonths", { months: data.revenueMonths }),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      status: "ok" as const,
    },
    {
      label: t("theoreticalFoodCost"),
      value: data.theoreticalFoodCostPercent
        ? `${data.theoreticalFoodCostPercent.toFixed(1)}%`
        : "—",
      sub: `${formatCurrency(data.theoreticalCostTotal)}€ ${t("theoretical")}`,
      icon: TrendingDown,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      status: data.monthsWithTheoreticalData > 0 ? ("partial" as const) : ("none" as const),
    },
    {
      label: t("syncStatus"),
      value: `${data.locationsWithGstock}/${data.totalLocations}`,
      sub: t("locationsConnected"),
      icon: Database,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
      status: data.locationsWithGstock > 0 ? ("ok" as const) : ("none" as const),
    },
    {
      label: t("wasteImpact"),
      value: data.wasteRecordCount > 0
        ? `${formatCurrency(data.wasteCostImpact)}€`
        : "—",
      sub: t("wasteRecords", { count: data.wasteRecordCount }),
      icon: Trash2,
      color: "text-red-600",
      bg: "bg-red-500/10",
      status: data.wasteRecordCount > 0 ? ("ok" as const) : ("none" as const),
    },
  ]

  // Determinar problemas de datos para el banner
  const issues: { key: string; severity: "warning" | "info" }[] = []
  if (!data.hasRealCostData) {
    issues.push({ key: "noRealCost", severity: "warning" })
  }
  if (data.monthsWithTheoreticalData < data.totalMonthsSynced && data.totalMonthsSynced > 0) {
    issues.push({ key: "partialTheoreticalData", severity: "info" })
  }
  if (data.locationsWithGstock < data.totalLocations) {
    issues.push({ key: "notAllLocationsMapped", severity: "info" })
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="py-3 gap-0">
            <CardHeader className="px-4 pb-1 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </span>
                <div className={cn("p-1.5 rounded-md", kpi.bg)}>
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-xl font-bold tracking-tight">
                  {kpi.value}
                </CardTitle>
                {kpi.status === "partial" && (
                  <CircleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {kpi.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner informativo de fiabilidad de datos */}
      {issues.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">
            {t("dataReliabilityTitle")}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1.5 space-y-1.5 text-xs text-amber-700 dark:text-amber-400/80">
              {issues.map((issue) => (
                <li key={issue.key} className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">
                    {issue.severity === "warning" ? (
                      <CircleAlert className="h-3 w-3 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    )}
                  </span>
                  <span>{t(issue.key)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-amber-600/80 dark:text-amber-500/60 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {t("moreDetailsInDocs")}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
