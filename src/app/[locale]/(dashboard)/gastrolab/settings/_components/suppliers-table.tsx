"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Supplier } from "@prisma/client"
import { DataTable } from "@/modules/shared/ui/data-table"

const columns: ColumnDef<Supplier>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.getValue("name")}</span>
        {row.original.commercialName && row.original.commercialName !== row.original.name && (
          <p className="text-xs text-muted-foreground">{row.original.commercialName}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Código",
  },
  {
    accessorKey: "contactPerson",
    header: "Contacto",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "phones",
    header: "Teléfono",
    cell: ({ row }) => (
      <div>
        {row.original.phone && <p>{row.original.phone}</p>}
        {row.original.mobile && (
          <p className="text-xs text-muted-foreground">{row.original.mobile}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "categoryName",
    header: "Categoría",
  },
  {
    accessorKey: "paymentTerms",
    header: "Cond. Pago",
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => {
      const active = row.getValue("active") as boolean | null
      if (active === null || active === undefined) return null
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {active ? "Activo" : "Inactivo"}
        </span>
      )
    },
  },
]

interface SuppliersTableProps {
  data: Supplier[]
}

export function SuppliersTable({ data }: SuppliersTableProps) {
  return <DataTable columns={columns} data={data} />
}
