"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MeasureUnit } from "@prisma/client"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Badge } from "@/modules/shared/ui/badge"

const columns: ColumnDef<MeasureUnit>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "abbreviation",
    header: "Abreviatura",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("abbreviation")}</Badge>,
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <Badge variant={type === 'WEIGHT' ? 'default' : type === 'VOLUME' ? 'secondary' : 'outline'}>
          {type}
        </Badge>
      )
    }
  },
  {
    accessorKey: "conversionFactor",
    header: "Factor Conversión",
    cell: ({ row }) => row.original.isBase ? "Base Unit" : row.getValue("conversionFactor"),
  },
]

interface UnitsTableProps {
  data: MeasureUnit[]
}

export function UnitsTable({ data }: UnitsTableProps) {
  return <DataTable columns={columns} data={data} />
}
