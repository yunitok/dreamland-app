"use client"

import { Card } from "@/modules/shared/ui/card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { Users, TrendingUp, Utensils, Crown, CalendarDays } from "lucide-react"
import type { KpiData } from "@/modules/sherlock/actions/cover-analytics"
import { cn } from "@/lib/utils"

const kpiConfig = [
  {
    key: "totalCovers" as const,
    label: "Total Comensales",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    format: (v: number) => v.toLocaleString("es-ES"),
    deltaKey: "coversDelta" as const,
  },
  {
    key: "avgDailyCovers" as const,
    label: "Media Diaria",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    format: (v: number) => Math.round(v).toLocaleString("es-ES"),
    deltaKey: "avgDailyDelta" as const,
  },
  {
    key: "avgPartySize" as const,
    label: "Media / Reserva",
    icon: Utensils,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    format: (v: number) => v.toFixed(1),
    deltaKey: null,
  },
  {
    key: "maxDayCovers" as const,
    label: "Pico (1 día)",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    format: (v: number) => v.toLocaleString("es-ES"),
    deltaKey: null,
  },
  {
    key: "periodDays" as const,
    label: "Días Analizados",
    icon: CalendarDays,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    format: (v: number) => v.toString(),
    deltaKey: null,
  },
]

interface Props {
  data: KpiData | null
  isPending: boolean
}

export function KpiCards({ data, isPending }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpiConfig.map((kpi) => (
        <Card key={kpi.key} className="rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", kpi.bg)}>
              <kpi.icon className={cn("h-5 w-5", kpi.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {kpi.label}
              </p>
              {isPending || !data ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <>
                  <p className="text-xl font-bold tabular-nums leading-tight">
                    {kpi.format(data[kpi.key] as number)}
                  </p>
                  {kpi.deltaKey && data[kpi.deltaKey] != null && (
                    <DeltaBadge value={data[kpi.deltaKey] as number} />
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function DeltaBadge({ value }: { value: number }) {
  const isPositive = value >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium mt-0.5",
        isPositive ? "text-emerald-600" : "text-red-500"
      )}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  )
}
