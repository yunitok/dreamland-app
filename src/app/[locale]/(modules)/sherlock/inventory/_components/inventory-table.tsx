"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/modules/shared/ui/badge"
import { DataTable } from "@/modules/shared/ui/data-table"
import { InventoryRecordWithRelations, deleteInventoryRecord } from "@/modules/sherlock/actions/inventory"
import { Link } from "@/i18n/navigation"
import { Button } from "@/modules/shared/ui/button"
import { Edit, MoreHorizontal, Trash2 } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

const columns: ColumnDef<InventoryRecordWithRelations>[] = [
    {
        id: "name",
        accessorKey: "ingredient.name",
        header: "Ingrediente",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.original.ingredient.name}</span>
                <span className="text-xs text-muted-foreground">{row.original.location || '-'}</span>
            </div>
        ),
    },
    {
        accessorKey: "quantity",
        header: "Cantidad",
        cell: ({ row }) => (
            <span className="font-mono">
                {row.original.quantity} {row.original.ingredient.unitType.abbreviation}
            </span>
        ),
    },
    {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
            const status = row.original.status
            const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
                AVAILABLE: "default",
                RESERVED: "secondary",
                EXPIRED: "destructive",
                QUARANTINE: "outline",
            }
            const labels: Record<string, string> = {
                AVAILABLE: "Disponible",
                RESERVED: "Reservado",
                EXPIRED: "Caducado",
                QUARANTINE: "Cuarentena",
            }
            return <Badge variant={variants[status]}>{labels[status] || status}</Badge>
        },
    },
    {
        accessorKey: "expiryDate",
        header: "Caducidad",
        cell: ({ row }) => {
            const date = row.original.expiryDate
            if (!date) return "-"
            return format(new Date(date), "dd MMM yyyy", { locale: es })
        },
    },
    {
        accessorKey: "createdAt",
        header: "Fecha Registro",
        cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const record = row.original

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
                            <Link href={`/sherlock/inventory/${record.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={async () => {
                                if (confirm("¿Estás seguro de eliminar este registro?")) {
                                    try {
                                        await deleteInventoryRecord(record.id)
                                        toast.success("Registro eliminado")
                                    } catch (error) {
                                        toast.error("Error al eliminar")
                                    }
                                }
                            }}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]

interface InventoryTableProps {
    data: InventoryRecordWithRelations[]
}

export function InventoryTable({ data }: InventoryTableProps) {
    return <DataTable columns={columns} data={data} searchPlaceholder="Buscar registros..." />
}
