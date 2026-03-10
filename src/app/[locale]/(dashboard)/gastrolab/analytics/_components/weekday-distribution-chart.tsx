"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/shared/ui/chart"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { Calendar } from "lucide-react"
import type { WeekdayDistribution } from "@/modules/gastrolab/actions/cover-analytics"

const chartConfig: ChartConfig = {
  avgCovers: {
    label: "Media comensales/día",
    color: "hsl(var(--chart-3))",
  },
}

interface Props {
  data: WeekdayDistribution[]
}

export function WeekdayDistributionChart({ data }: Props) {
  const isEmpty = data.every((d) => d.avgCovers === 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Distribución Semanal
        </CardTitle>
        <CardDescription>Patrón por día de la semana</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid />
              <PolarAngleAxis
                dataKey="day"
                fontSize={12}
                tickLine={false}
              />
              <PolarRadiusAxis
                fontSize={10}
                angle={90}
                tickFormatter={(v) => v.toLocaleString("es-ES")}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Radar
                dataKey="avgCovers"
                stroke="var(--color-avgCovers)"
                fill="var(--color-avgCovers)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
