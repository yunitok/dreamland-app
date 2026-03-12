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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { CategoryCostPoint } from "@/modules/sherlock/actions/food-cost-analytics"

interface Props {
  data: CategoryCostPoint[]
}

export function CategoryCostChart({ data }: Props) {
  const t = useTranslations("sherlock.foodCost")

  // Top 10 categorías
  const chartData = data.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("byCategory")}
        </CardTitle>
        <CardDescription>{t("byCategoryDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                className="text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11 }}
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
              <Bar
                dataKey="amount"
                fill="hsl(221 83% 53%)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
