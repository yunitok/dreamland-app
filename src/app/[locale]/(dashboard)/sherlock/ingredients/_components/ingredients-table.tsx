"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/modules/shared/ui/badge"
import { DataTable } from "@/modules/shared/ui/data-table"
import { IngredientWithRelations } from "@/modules/sherlock/actions/ingredients"
import { Link } from "@/i18n/navigation"
import { Button } from "@/modules/shared/ui/button"
import { Edit, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"

const columns: ColumnDef<IngredientWithRelations>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue("name")}</span>
        <span className="text-xs text-muted-foreground">{row.original.reference || '-'}</span>
      </div>
    ),
  },
  {
    accessorKey: "category.name",
    header: "Categoría",
    cell: ({ row }) => <Badge variant="secondary">{row.original.category.name}</Badge>,
  },
  {
    accessorKey: "currentStock",
    header: "Stock",
    cell: ({ row }) => {
      const stock = row.original.currentStock || 0
      const unit = row.original.unitType.abbreviation
      const min = row.original.minStock || 0

      return (
        <div className={`font-mono ${stock <= min ? "text-red-500 font-bold" : ""}`}>
          {stock} {unit}
        </div>
      )
    }
  },
  {
    accessorKey: "cost",
    header: "Coste",
    cell: ({ row }) => {
      const cost = row.getValue("cost") as number
      return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cost) + ` / ${row.original.unitType.abbreviation}`
    }
  },
  {
    accessorKey: "supplier.name",
    header: "Proveedor",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const ingredient = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/sherlock/ingredients/${ingredient.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </DropdownMenuItem>
            {/* Add Delete/Archive actions here */}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface IngredientsTableProps {
  data: IngredientWithRelations[]
}

export function IngredientsTable({ data }: IngredientsTableProps) {
  return <DataTable columns={columns} data={data} searchPlaceholder="Buscar ingredientes..." />
}
