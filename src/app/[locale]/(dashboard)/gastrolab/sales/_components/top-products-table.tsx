"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/modules/shared/ui/card"
import { ShoppingBag } from "lucide-react"
import type { TopProductPoint } from "@/modules/gastrolab/actions/agora-analytics"

interface Props {
  data: TopProductPoint[]
}

export function TopProductsTable({ data }: Props) {
  const isEmpty = data.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          Top Productos
        </CardTitle>
        <CardDescription>
          Productos mas vendidos por cantidad
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Producto</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cantidad</th>
                  <th className="pb-2 font-medium text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={item.productName} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground tabular-nums">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-4 font-medium">{item.productName}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {item.quantity.toLocaleString("es-ES")}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {item.amount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      EUR
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
