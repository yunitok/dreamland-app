"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { Calculator } from "lucide-react"
import type { TaxSummaryPoint } from "@/modules/sherlock/actions/agora-analytics"

interface Props {
  data: TaxSummaryPoint[]
}

function fmtEur(v: number) {
  return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TaxBreakdownTable({ data }: Props) {
  const isEmpty = data.length === 0

  const totals = data.reduce(
    (acc, t) => ({
      netAmount: acc.netAmount + t.netAmount,
      vatAmount: acc.vatAmount + t.vatAmount,
      surchargeAmount: acc.surchargeAmount + t.surchargeAmount,
    }),
    { netAmount: 0, vatAmount: 0, surchargeAmount: 0 }
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          Desglose Fiscal
        </CardTitle>
        <CardDescription>Resumen de impuestos por tipo de IVA</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos fiscales
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Tipo IVA</th>
                  <th className="text-right py-2 font-medium">Base Imponible</th>
                  <th className="text-right py-2 font-medium">Cuota IVA</th>
                  <th className="text-right py-2 font-medium">Rec. Eq.</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.vatRate} className="border-b">
                    <td className="py-2 font-medium">
                      {(t.vatRate * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 text-right tabular-nums">{fmtEur(t.netAmount)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtEur(t.vatAmount)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtEur(t.surchargeAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(totals.netAmount)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(totals.vatAmount)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(totals.surchargeAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
