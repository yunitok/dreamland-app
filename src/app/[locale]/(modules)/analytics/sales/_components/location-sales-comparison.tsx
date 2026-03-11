"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
import { MapPin } from "lucide-react"
import type { LocationSalesTrendPoint } from "@/modules/analytics/actions/agora-analytics"
import { useMemo } from "react"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(221 83% 53%)",
  "hsl(262 83% 58%)",
  "hsl(330 81% 60%)",
]

interface Props {
  data: LocationSalesTrendPoint[]
  locations: { id: string; name: string }[]
  className?: string
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "")
}

export function LocationSalesComparison({ data, locations, className }: Props) {
  const isEmpty = data.length === 0

  const { slugNames, chartConfig, chartData } = useMemo(() => {
    const nameToSlug = new Map<string, string>()
    locations.forEach((l) => nameToSlug.set(l.name, slugify(l.name)))

    const config: ChartConfig = {}
    locations.forEach((l, i) => {
      const slug = nameToSlug.get(l.name)!
      config[slug] = {
        label: l.name.replace("Voltereta ", ""),
        color: COLORS[i % COLORS.length],
      }
    })

    const mapped = data.map((point) => {
      const remapped: Record<string, string | number> = { period: point.period }
      for (const [key, val] of Object.entries(point)) {
        if (key === "period") continue
        const slug = nameToSlug.get(key)
        if (slug) remapped[slug] = val
      }
      return remapped
    })

    return {
      slugNames: locations.map((l) => nameToSlug.get(l.name)!),
      chartConfig: config,
      chartData: mapped,
    }
  }, [locations, data])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Comparativa por Local
        </CardTitle>
        <CardDescription>Facturacion por restaurante</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) => v.slice(2)}
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
                    formatter={(value) =>
                      `${Number(value).toLocaleString("es-ES")} EUR`
                    }
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {slugNames.map((slug) => (
                <Bar
                  key={slug}
                  dataKey={slug}
                  fill={`var(--color-${slug})`}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
