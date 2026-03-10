"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Vault } from "lucide-react"
import type { CashReconciliationData } from "@/modules/gastrolab/actions/agora-analytics"
import { cn } from "@/lib/utils"

interface Props {
  data: CashReconciliationData | null
}

function fmtEur(v: number) {
  return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR"
}

export function CashReconciliationCard({ data }: Props) {
  if (!data || (data.totalExpected === 0 && data.totalReal === 0)) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Vault className="h-4 w-4 text-muted-foreground" />
            Cuadre de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos de cierre de caja
          </div>
        </CardContent>
      </Card>
    )
  }

  const absDiff = Math.abs(data.totalDifference)
  const statusColor =
    absDiff <= 50
      ? "text-emerald-600"
      : absDiff <= 200
        ? "text-amber-600"
        : "text-red-600"
  const statusBg =
    absDiff <= 50
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : absDiff <= 200
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : "bg-red-500/10 text-red-700 border-red-500/20"
  const statusLabel =
    absDiff <= 50 ? "OK" : absDiff <= 200 ? "Atencion" : "Descuadre"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Vault className="h-4 w-4 text-muted-foreground" />
          Cuadre de Caja
        </CardTitle>
        <CardDescription>
          {data.daysWithDiscrepancy > 0
            ? `${data.daysWithDiscrepancy} dia${data.daysWithDiscrepancy > 1 ? "s" : ""} con descuadre > 50 EUR`
            : "Todos los cierres dentro de tolerancia"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Esperado</p>
            <p className="text-sm font-semibold tabular-nums">{fmtEur(data.totalExpected)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Real</p>
            <p className="text-sm font-semibold tabular-nums">{fmtEur(data.totalReal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <p className={cn("text-sm font-semibold tabular-nums", statusColor)}>
              {data.totalDifference >= 0 ? "+" : ""}{fmtEur(data.totalDifference)}
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Badge variant="outline" className={statusBg}>
            {statusLabel}
          </Badge>
        </div>

        {/* Top descuadres */}
        {data.details.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Mayores descuadres
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 font-medium">Fecha</th>
                    <th className="text-left py-1 font-medium">Local</th>
                    <th className="text-right py-1 font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.slice(0, 8).map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 tabular-nums">{d.date}</td>
                      <td className="py-1 truncate max-w-[120px]">{d.locationName}</td>
                      <td
                        className={cn(
                          "py-1 text-right tabular-nums font-medium",
                          Math.abs(d.difference) > 50 ? "text-red-600" : "text-muted-foreground"
                        )}
                      >
                        {d.difference >= 0 ? "+" : ""}{d.difference.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
