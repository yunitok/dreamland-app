"use client"

import { Card } from "@/modules/shared/ui/card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import type { SalesKpiData } from "@/modules/gastrolab/actions/agora-analytics"

interface Props {
  data: SalesKpiData | null
  isPending: boolean
}

const secondaryKpis = [
  {
    key: "totalInvoices" as const,
    label: "Facturas",
    format: (v: number) => v.toLocaleString("es-ES"),
  },
  {
    key: "avgSpendPerGuest" as const,
    label: "Gasto / Comensal",
    format: (v: number) =>
      `${v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`,
  },
  {
    key: "totalGrossAmount" as const,
    label: "Facturacion Bruta",
    format: (v: number) =>
      `${v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`,
  },
  {
    key: "totalNetAmount" as const,
    label: "Base Imponible",
    format: (v: number) =>
      `${v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`,
  },
]

export function SecondaryKpiCards({ data, isPending }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {secondaryKpis.map((kpi) => {
        const value = data ? (data[kpi.key] as number) : 0

        return (
          <Card key={kpi.key} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            {isPending || !data ? (
              <Skeleton className="h-5 w-16 mt-1" />
            ) : (
              <p className="text-sm font-semibold tabular-nums">
                {kpi.format(value)}
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
