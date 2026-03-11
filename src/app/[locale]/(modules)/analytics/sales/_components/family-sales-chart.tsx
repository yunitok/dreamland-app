"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/shared/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { LayoutGrid } from "lucide-react"
import type { FamilySalesPoint } from "@/modules/analytics/actions/agora-analytics"

const chartConfig: ChartConfig = {
  amount: { label: "Importe", color: "hsl(var(--chart-1))" },
}

interface Props {
  data: FamilySalesPoint[]
}

export function FamilySalesChart({ data }: Props) {
  const isEmpty = data.length === 0
  const top10 = data.slice(0, 10)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          Ventas por Familia
        </CardTitle>
        <CardDescription>Top 10 familias de producto</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                }
              />
              <YAxis
                type="category"
                dataKey="familyName"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={120}
                tickFormatter={(v) =>
                  v.length > 18 ? v.slice(0, 16) + "..." : v
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `${Number(value).toLocaleString("es-ES")} EUR`
                    }
                  />
                }
              />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
