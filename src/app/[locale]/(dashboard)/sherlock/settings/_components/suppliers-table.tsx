"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Supplier } from "@prisma/client"
import { DataTable } from "@/modules/shared/ui/data-table"

const columns: ColumnDef<Supplier>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "code",
    header: "Código",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
  },
  {
    accessorKey: "paymentTerms",
    header: "Condiciones Pago",
  },
]

interface SuppliersTableProps {
  data: Supplier[]
}

export function SuppliersTable({ data }: SuppliersTableProps) {
  return <DataTable columns={columns} data={data} />
}
