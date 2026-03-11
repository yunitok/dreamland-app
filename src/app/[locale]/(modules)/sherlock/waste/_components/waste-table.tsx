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
    DropdownMenuTrigger
} from "@/modules/shared/ui/dropdown-menu"
import { MoreHorizontal, Trash } from "lucide-react"
import { WasteRecordWithRelations, deleteWasteRecord } from "@/modules/sherlock/actions/waste"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface WasteTableProps {
    data: WasteRecordWithRelations[]
}

const reasonLabels: Record<string, string> = {
    EXPIRED: "Caducado",
    BURNED: "Quemado",
    SPOILED: "Estropeado",
    QUALITY_ISSUE: "Problema de Calidad",
    OVERPRODUCTION: "Sobreproducción",
    YIELD_LOSS: "Pérdida de Rendimiento",
    OTHER: "Otro"
}

export function WasteTable({ data }: WasteTableProps) {
    const router = useRouter()

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este registro de merma?")) {
            try {
                await deleteWasteRecord(id)
                toast.success("Registro eliminado")
                router.refresh()
            } catch (error) {
                toast.error("Error al eliminar")
            }
        }
    }

    const columns: ColumnDef<WasteRecordWithRelations>[] = [
        {
            id: "name",
            accessorKey: "ingredient.name",
            header: "Ingrediente",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.ingredient.name}</span>
                </div>
            )
        },
        {
            accessorKey: "quantity",
            header: "Cantidad",
            cell: ({ row }) => (
                <span className="font-mono">
                    {row.original.quantity} {row.original.ingredient.unitType.abbreviation}
                </span>
            )
        },
        {
            accessorKey: "reason",
            header: "Motivo",
            cell: ({ row }) => (
                <Badge variant="outline">
                    {reasonLabels[row.original.reason] || row.original.reason}
                </Badge>
            )
        },
        {
            accessorKey: "createdAt",
            header: "Fecha",
            cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy HH:mm", { locale: es })
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                < MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => handleDelete(row.original.id)}
                                className="text-destructive"
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]

    return <DataTable columns={columns} data={data} searchPlaceholder="Buscar mermas..." />
}
