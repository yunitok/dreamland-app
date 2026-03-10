"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { Sun, Moon, Footprints } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  serviceSplit: { lunch: number; dinner: number; walkin: number } | null
  isPending: boolean
}

export function HourlyHeatmap({ serviceSplit, isPending }: Props) {
  if (isPending || !serviceSplit) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Desglose por Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[120px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const { lunch, dinner, walkin } = serviceSplit
  const total = lunch + dinner
  const lunchPct = total > 0 ? (lunch / total) * 100 : 0
  const dinnerPct = total > 0 ? (dinner / total) * 100 : 0
  const walkinPct = total > 0 ? (walkin / total) * 100 : 0

  const segments = [
    {
      label: "Comida",
      value: lunch,
      pct: lunchPct,
      icon: Sun,
      color: "bg-amber-400",
      textColor: "text-amber-600",
    },
    {
      label: "Cena",
      value: dinner,
      pct: dinnerPct,
      icon: Moon,
      color: "bg-indigo-400",
      textColor: "text-indigo-600",
    },
    {
      label: "Walk-ins",
      value: walkin,
      pct: walkinPct,
      icon: Footprints,
      color: "bg-emerald-400",
      textColor: "text-emerald-600",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Desglose por Servicio
        </CardTitle>
        <CardDescription>
          Distribución comida vs cena (walk-ins incluidos en ambos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Barra proporcional */}
        <div className="flex h-6 rounded-full overflow-hidden mb-4">
          <div
            className="bg-amber-400 transition-all"
            style={{ width: `${lunchPct}%` }}
          />
          <div
            className="bg-indigo-400 transition-all"
            style={{ width: `${dinnerPct}%` }}
          />
        </div>

        {/* Leyenda con valores */}
        <div className="grid grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-md", seg.color + "/10")}>
                <seg.icon className={cn("h-4 w-4", seg.textColor)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{seg.label}</p>
                <p className="text-sm font-semibold tabular-nums">
                  {seg.value.toLocaleString("es-ES")}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({seg.pct.toFixed(0)}%)
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
