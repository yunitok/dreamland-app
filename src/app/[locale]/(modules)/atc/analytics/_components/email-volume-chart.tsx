"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/shared/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { EmailVolumePoint } from "@/modules/atc/actions/atc-analytics"

const chartConfig: ChartConfig = {
  count: { label: "Emails", color: "hsl(var(--chart-1))" },
}

interface Props {
  data: EmailVolumePoint[]
  isPending: boolean
}

export function EmailVolumeChart({ data, isPending }: Props) {
  if (isPending && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volumen de emails (14 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volumen de emails (14 días)</CardTitle>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                fill="url(#fillEmails)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
