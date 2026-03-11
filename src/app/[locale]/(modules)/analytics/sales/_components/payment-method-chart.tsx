"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/shared/ui/chart"
import { PieChart, Pie, Cell } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { Wallet } from "lucide-react"
import type { PaymentSplitPoint } from "@/modules/analytics/actions/agora-analytics"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210 40% 70%)",
  "hsl(340 60% 60%)",
]

const chartConfig: ChartConfig = {
  amount: { label: "Importe" },
}

interface Props {
  data: PaymentSplitPoint[]
}

export function PaymentMethodChart({ data }: Props) {
  const isEmpty = data.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          Formas de Pago
        </CardTitle>
        <CardDescription>Desglose por metodo de pago</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ChartContainer config={chartConfig} className="h-[260px] w-[260px] shrink-0">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `${Number(value).toLocaleString("es-ES")} EUR`
                      }
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="paymentMethodName"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      stroke="none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Leyenda */}
            <div className="flex flex-col gap-2 text-sm min-w-0">
              {data.map((item, i) => (
                <div key={item.paymentMethodName} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate">{item.paymentMethodName}</span>
                  <span className="ml-auto text-muted-foreground tabular-nums whitespace-nowrap">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
