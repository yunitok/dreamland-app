"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/shared/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { TrendingUp } from "lucide-react"
import type { SalesTrendPoint } from "@/modules/sherlock/actions/agora-analytics"
import type { Granularity } from "@/modules/sherlock/actions/cover-analytics"
import { cn } from "@/lib/utils"

const chartConfig: ChartConfig = {
  revenue: { label: "Facturacion", color: "hsl(var(--chart-1))" },
  avgTicket: { label: "Ticket Medio", color: "hsl(var(--chart-2))" },
}

const GRAN_LABELS: Record<Granularity, string> = {
  day: "diaria",
  week: "semanal",
  month: "mensual",
}

interface Props {
  data: SalesTrendPoint[]
  granularity: Granularity
  className?: string
}

export function SalesTrendChart({ data, granularity, className }: Props) {
  const isEmpty = data.length === 0

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Tendencia de Facturacion
        </CardTitle>
        <CardDescription>
          Evolucion {GRAN_LABELS[granularity]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos para el periodo seleccionado
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                tickFormatter={(v) =>
                  granularity === "month"
                    ? v.slice(2)
                    : v.slice(5)
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name) => {
                      if (name === "revenue") return `${Number(value).toLocaleString("es-ES")} EUR`
                      return `${Number(value).toFixed(2)} EUR`
                    }}
                  />
                }
              />
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="url(#fillRevenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
