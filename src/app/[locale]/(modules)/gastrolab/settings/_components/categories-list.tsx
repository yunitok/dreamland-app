"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Badge } from "@/modules/shared/ui/badge"

type CategoryWithRelations = Category & {
  parent?: Category | null
  _count?: {
    ingredients: number
  }
}

const columns: ColumnDef<CategoryWithRelations>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "parent.name",
    header: "Categoría Padre",
    cell: ({ row }) => row.original.parent ? (
      <Badge variant="outline">{row.original.parent.name}</Badge>
    ) : (
      <span className="text-muted-foreground text-xs italic">Raíz</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Descripción",
  },
]

interface CategoriesListProps {
  data: CategoryWithRelations[]
}

export function CategoriesList({ data }: CategoriesListProps) {
  return <DataTable columns={columns} data={data} />
}
