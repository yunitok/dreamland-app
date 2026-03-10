"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { Trophy } from "lucide-react"
import type { LocationRankingPoint } from "@/modules/gastrolab/actions/agora-analytics"
import { cn } from "@/lib/utils"

interface Props {
  data: LocationRankingPoint[]
}

function fmtEur(v: number) {
  return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function LocationRankingTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Ranking de Locales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Ranking de Locales
        </CardTitle>
        <CardDescription>Comparativa de rendimiento entre restaurantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium w-8">#</th>
                <th className="text-left py-2 font-medium">Restaurante</th>
                <th className="text-right py-2 font-medium">Facturacion</th>
                <th className="text-right py-2 font-medium">Ticket Medio</th>
                <th className="text-right py-2 font-medium">Comensales</th>
                <th className="text-right py-2 font-medium">Facturas</th>
                <th className="text-right py-2 font-medium">Desc. Caja</th>
              </tr>
            </thead>
            <tbody>
              {data.map((loc, i) => (
                <tr
                  key={loc.locationId}
                  className={cn(
                    "border-b last:border-0",
                    i === 0 && "bg-emerald-500/5"
                  )}
                >
                  <td className="py-2 font-medium text-muted-foreground">{i + 1}</td>
                  <td className="py-2 font-medium">{loc.locationName}</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(loc.totalRevenue)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(loc.avgTicket)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {loc.totalGuests.toLocaleString("es-ES")}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {loc.totalInvoices.toLocaleString("es-ES")}
                  </td>
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums",
                      loc.cashDifference !== null && Math.abs(loc.cashDifference) > 50
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {loc.cashDifference !== null
                      ? `${loc.cashDifference >= 0 ? "+" : ""}${loc.cashDifference.toFixed(2)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
