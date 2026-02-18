"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import { MoreHorizontal, CheckCircle, ArrowUpCircle } from "lucide-react"
import { QueryStatus, QueryCategory } from "@prisma/client"
import { escalateQuery } from "@/modules/atc/actions/queries"
import { toast } from "sonner"

type QueryRow = {
  id: string
  guestInput: string
  channel: string
  status: QueryStatus
  confidenceScore: number | null
  createdAt: Date
  category: QueryCategory
  resolutions: { responseText: string; source: string }[]
}

const statusColors: Record<QueryStatus, string> = {
  OPEN:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RESOLVED:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ESCALATED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

function ActionsCell({ row }: { row: { original: QueryRow } }) {
  const query = row.original

  async function handleEscalate() {
    const result = await escalateQuery(query.id)
    if (result.success) {
      toast.success("Consulta escalada")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Acciones</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEscalate} disabled={query.status === "ESCALATED"}>
          <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />
          Escalar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns: ColumnDef<QueryRow>[] = [
  {
    accessorKey: "guestInput",
    header: "Consulta",
    cell: ({ row }) => (
      <div className="max-w-xs truncate text-sm">{row.getValue("guestInput")}</div>
    ),
  },
  {
    accessorKey: "category",
    header: "Categoría",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.category.name}</Badge>
    ),
  },
  {
    accessorKey: "channel",
    header: "Canal",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as QueryStatus
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      )
    },
  },
  {
    accessorKey: "confidenceScore",
    header: "Confianza IA",
    cell: ({ row }) => {
      const score = row.getValue("confidenceScore") as number | null
      return score ? (
        <span className="font-mono text-sm">{Math.round(score * 100)}%</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return (
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString("es-ES")}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]

interface QueriesTableProps {
  data: QueryRow[]
  categories: QueryCategory[]
}

export function QueriesTable({ data }: QueriesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="guestInput"
      searchPlaceholder="Buscar consulta..."
    />
  )
}
