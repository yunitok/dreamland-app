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
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { TrendingUp } from "lucide-react"
import type {
  TrendDataPoint,
  Granularity,
} from "@/modules/gastrolab/actions/cover-analytics"
import { cn } from "@/lib/utils"

const chartConfig: ChartConfig = {
  covers: { label: "Comensales", color: "hsl(var(--chart-1))" },
  reservations: { label: "Reservas", color: "hsl(var(--chart-2))" },
}

const GRAN_LABELS: Record<Granularity, string> = {
  day: "diaria",
  week: "semanal",
  month: "mensual",
}

interface Props {
  data: TrendDataPoint[]
  granularity: Granularity
  className?: string
}

export function CoversTrendChart({ data, granularity, className }: Props) {
  const isEmpty = data.length === 0

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Tendencia de Comensales
        </CardTitle>
        <CardDescription>
          Evolución {GRAN_LABELS[granularity]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos para el período seleccionado
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
                    ? v.slice(2) // "2025-01" → "25-01"
                    : v.slice(5) // "2025-01-15" → "01-15"
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
                content={<ChartTooltipContent indicator="dot" />}
              />
              <defs>
                <linearGradient id="fillCovers" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-covers)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-covers)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="covers"
                stroke="var(--color-covers)"
                fill="url(#fillCovers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
