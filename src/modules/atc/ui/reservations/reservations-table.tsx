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
import { MoreHorizontal, CheckCircle, XCircle, UserCheck } from "lucide-react"
import { ReservationChannel, ReservationStatus } from "@prisma/client"
import { updateReservationStatus, deleteReservation } from "@/modules/atc/actions/reservations"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

type ReservationRow = {
  id: string
  guestName: string
  guestEmail: string | null
  guestPhone: string | null
  partySize: number
  date: Date
  time: string
  status: ReservationStatus
  notes: string | null
  channel: ReservationChannel
}

const statusColors: Record<ReservationStatus, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SEATED:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  NO_SHOW:   "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  WAITING:   "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}

function ActionsCell({ row }: { row: { original: ReservationRow } }) {
  const t = useTranslations("atc")
  const reservation = row.original

  async function handleStatusChange(status: ReservationStatus) {
    const result = await updateReservationStatus(reservation.id, status)
    if (result.success) {
      toast.success("Estado actualizado")
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    const result = await deleteReservation(reservation.id)
    if (result.success) {
      toast.success("Reserva eliminada")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t("actions")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleStatusChange("CONFIRMED")}>
          <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
          Confirmar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("SEATED")}>
          <UserCheck className="mr-2 h-4 w-4 text-green-500" />
          En mesa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("CANCELLED")}>
          <XCircle className="mr-2 h-4 w-4 text-red-500" />
          Cancelar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600"
        >
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns: ColumnDef<ReservationRow>[] = [
  {
    accessorKey: "guestName",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue("guestName")}</span>
        <span className="text-xs text-muted-foreground">{row.original.guestPhone ?? ""}</span>
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      return (
        <div className="flex flex-col">
          <span className="font-mono text-sm">
            {date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
          <span className="text-xs text-muted-foreground">{row.original.time}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "partySize",
    header: "Comensales",
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("partySize")}</span>
    ),
  },
  {
    accessorKey: "channel",
    header: "Canal",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.channel.name}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as ReservationStatus
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]

interface ReservationsTableProps {
  data: ReservationRow[]
  channels: ReservationChannel[]
}

export function ReservationsTable({ data }: ReservationsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="guestName"
      searchPlaceholder="Buscar por nombre..."
    />
  )
}
