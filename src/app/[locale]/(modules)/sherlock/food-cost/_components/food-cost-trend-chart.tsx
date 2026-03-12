"use client"

import { useTranslations } from "next-intl"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import type { FoodCostTrendPoint } from "@/modules/sherlock/actions/food-cost-analytics"
import { cn } from "@/lib/utils"

interface Props {
  data: FoodCostTrendPoint[]
  className?: string
}

export function FoodCostTrendChart({ data, className }: Props) {
  const t = useTranslations("sherlock.foodCost")

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("trendTitle")}
        </CardTitle>
        <CardDescription>{t("trendDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) =>
                  `${value.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€`
                }
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="realCost"
                name={t("realCost")}
                stroke="hsl(221 83% 53%)"
                fill="hsl(221 83% 53% / 0.1)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="theoreticalCost"
                name={t("theoreticalCost")}
                stroke="hsl(142 71% 45%)"
                fill="hsl(142 71% 45% / 0.1)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
