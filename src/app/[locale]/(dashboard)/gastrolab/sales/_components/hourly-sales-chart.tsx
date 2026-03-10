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
import { Clock } from "lucide-react"
import type { HourlySalesPoint } from "@/modules/gastrolab/actions/agora-analytics"

const chartConfig: ChartConfig = {
  totalAmount: { label: "Facturacion", color: "hsl(var(--chart-1))" },
}

interface Props {
  data: HourlySalesPoint[]
}

export function HourlySalesChart({ data }: Props) {
  const isEmpty = data.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Distribucion Horaria
        </CardTitle>
        <CardDescription>Facturacion acumulada por hora del dia</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) => `${v}h`}
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
                    formatter={(value, name) => {
                      if (name === "totalAmount")
                        return `${Number(value).toLocaleString("es-ES")} EUR`
                      return String(value)
                    }}
                    labelFormatter={(label) => `${label}:00 - ${label}:59`}
                  />
                }
              />
              <defs>
                <linearGradient id="fillHourly" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-totalAmount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-totalAmount)"
                    stopOpacity={0.3}
                  />
                </linearGradient>
              </defs>
              <Bar
                dataKey="totalAmount"
                fill="url(#fillHourly)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
