"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Button } from "@/modules/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import { MoreHorizontal, CheckCircle, Trash2 } from "lucide-react"
import { IncidentType, IncidentSeverity, IncidentStatus } from "@prisma/client"
import { resolveIncident, deleteIncident } from "@/modules/atc/actions/operations"
import { toast } from "sonner"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/shared/ui/alert-dialog"

type IncidentRow = {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  description: string
  status: IncidentStatus
  assignedTo: string | null
  createdAt: Date
}

const severityColors: Record<IncidentSeverity, string> = {
  LOW:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MEDIUM:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HIGH:     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusColors: Record<IncidentStatus, string> = {
  OPEN:        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  RESOLVED:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CLOSED:      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

function ActionsCell({ row, isSuperAdmin }: { row: { original: IncidentRow }; isSuperAdmin: boolean }) {
  const incident = row.original
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleResolve() {
    const result = await resolveIncident(incident.id)
    if (result.success) {
      toast.success("Incidencia resuelta")
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    const result = await deleteIncident(incident.id)
    if (result.success) {
      toast.success("Incidencia eliminada")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
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
          <DropdownMenuItem
            onClick={handleResolve}
            disabled={incident.status === "RESOLVED" || incident.status === "CLOSED"}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Resolver
          </DropdownMenuItem>
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar incidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la incidencia <span className="font-medium text-foreground">{incident.type}</span> permanentemente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function getColumns(isSuperAdmin: boolean): ColumnDef<IncidentRow>[] {
  return [
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.getValue("type")}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <div className="max-w-xs truncate text-sm">{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "severity",
    header: "Severidad",
    cell: ({ row }) => {
      const severity = row.getValue("severity") as IncidentSeverity
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColors[severity]}`}>
          {severity}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as IncidentStatus
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
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
    enableSorting: false,
    cell: ({ row }) => <ActionsCell row={row} isSuperAdmin={isSuperAdmin} />,
  },
]}

interface IncidentsTableProps {
  data: IncidentRow[]
  isSuperAdmin?: boolean
}

export function IncidentsTable({ data, isSuperAdmin = false }: IncidentsTableProps) {
  const columns = getColumns(isSuperAdmin)
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="description"
      searchPlaceholder="Buscar incidencia..."
    />
  )
}
