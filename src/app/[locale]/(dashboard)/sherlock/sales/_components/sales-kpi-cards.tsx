"use client"

import { Card } from "@/modules/shared/ui/card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import {
  Euro,
  TrendingUp,
  Receipt,
  Users,
  HandCoins,
  Vault,
} from "lucide-react"
import type { SalesKpiData } from "@/modules/sherlock/actions/agora-analytics"
import { cn } from "@/lib/utils"

const kpiConfig = [
  {
    key: "totalRevenue" as const,
    label: "Facturacion Total",
    icon: Euro,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    format: (v: number) => `${v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`,
    deltaKey: "revenueDelta" as const,
    conditionalColor: null,
  },
  {
    key: "avgDailyRevenue" as const,
    label: "Media Diaria",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    format: (v: number) => `${v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`,
    deltaKey: null,
    conditionalColor: null,
  },
  {
    key: "avgTicket" as const,
    label: "Ticket Medio",
    icon: Receipt,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    format: (v: number) => `${v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`,
    deltaKey: "avgTicketDelta" as const,
    conditionalColor: null,
  },
  {
    key: "totalGuests" as const,
    label: "Comensales",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    format: (v: number) => v.toLocaleString("es-ES"),
    deltaKey: null,
    conditionalColor: null,
  },
  {
    key: "totalTips" as const,
    label: "Propinas",
    icon: HandCoins,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    format: (v: number) => `${v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`,
    deltaKey: null,
    conditionalColor: null,
  },
  {
    key: "totalCashDifference" as const,
    label: "Descuadre Caja",
    icon: Vault,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    format: (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`,
    deltaKey: null,
    conditionalColor: (v: number) => {
      const abs = Math.abs(v)
      if (abs <= 50) return "text-emerald-600"
      if (abs <= 200) return "text-amber-600"
      return "text-red-600"
    },
  },
]

interface Props {
  data: SalesKpiData | null
  isPending: boolean
}

export function SalesKpiCards({ data, isPending }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <>
                  <p className={cn(
                    "text-lg font-bold tabular-nums leading-tight",
                    kpi.conditionalColor ? kpi.conditionalColor(data[kpi.key] as number) : undefined
                  )}>
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
