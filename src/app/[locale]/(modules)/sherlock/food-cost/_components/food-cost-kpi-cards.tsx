"use client"

import { useTranslations } from "next-intl"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import type { FoodCostKpiData } from "@/modules/sherlock/actions/food-cost-analytics"

interface Props {
  data: FoodCostKpiData | null
  isPending: boolean
}

export function FoodCostKpiCards({ data, isPending }: Props) {
  const t = useTranslations("sherlock.foodCost")

  const cards = [
    {
      title: t("realCost"),
      value: data ? `${data.realCostTotal.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€` : null,
      delta: data?.realCostDelta,
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      title: t("theoreticalCost"),
      value: data ? `${data.theoreticalCostTotal.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€` : null,
      delta: null,
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: t("foodCostPercent"),
      value: data?.foodCostPercent != null ? `${data.foodCostPercent.toFixed(1)}%` : "N/A",
      delta: data?.foodCostPercentDelta,
      icon: Percent,
      color: "text-purple-500",
      invertDelta: true,
    },
    {
      title: t("variance"),
      value: data ? `${data.variance >= 0 ? "+" : ""}${data.variance.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€` : null,
      subtitle: data ? `${data.variancePercent >= 0 ? "+" : ""}${data.variancePercent.toFixed(1)}%` : null,
      icon: data && data.variance > 0 ? TrendingUp : TrendingDown,
      color: data && data.variance > 0 ? "text-red-500" : "text-emerald-500",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="py-4 gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent className="px-4">
            {isPending || !data ? (
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
                      (card.invertDelta ? -card.delta : card.delta) > 0
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {card.delta > 0 ? "▲" : "▼"}{" "}
                    {Math.abs(card.delta).toFixed(1)}
                    {card.invertDelta ? "pp" : "%"}
                  </Badge>
                )}
                {card.subtitle && (
                  <span className="text-xs text-muted-foreground">
                    ({card.subtitle})
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
