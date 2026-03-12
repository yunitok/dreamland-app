"use client"

import { useTranslations } from "next-intl"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import type { VarianceItemPoint } from "@/modules/sherlock/actions/food-cost-analytics"

interface Props {
  data: VarianceItemPoint[]
}

export function LocationCostTable({ data }: Props) {
  const t = useTranslations("sherlock.foodCost")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("byLocation")}
        </CardTitle>
        <CardDescription>{t("byLocationDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_90px_60px] gap-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{t("location")}</span>
              <span className="text-right">{t("realCost")}</span>
              <span className="text-right">{t("theoreticalCost")}</span>
              <span className="text-right">{t("variance")}</span>
              <span className="text-right">FC%</span>
            </div>

            {/* Rows */}
            {data.map((row) => (
              <div
                key={row.locationName}
                className="grid grid-cols-[1fr_80px_80px_90px_60px] gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
              >
                <span className="font-medium truncate">
                  {row.locationName}
                </span>
                <span className="text-right tabular-nums">
                  {(row.realCost / 1000).toFixed(1)}k
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {(row.theoreticalCost / 1000).toFixed(1)}k
                </span>
                <span className="text-right">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 tabular-nums ${
                      row.variance > 0
                        ? "text-red-600 border-red-200"
                        : "text-emerald-600 border-emerald-200"
                    }`}
                  >
                    {row.variance > 0 ? "+" : ""}
                    {(row.variance / 1000).toFixed(1)}k
                  </Badge>
                </span>
                <span className="text-right tabular-nums text-xs">
                  {row.foodCostPercent != null
                    ? `${row.foodCostPercent.toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
