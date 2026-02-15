"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import { Eye } from "lucide-react"
import { VoiceAuditWithRelations } from "@/modules/sherlock/actions/audits"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AuditTableProps {
    data: VoiceAuditWithRelations[]
}

export function AuditTable({ data }: AuditTableProps) {
    const columns: ColumnDef<VoiceAuditWithRelations>[] = [
        {
            id: "name",
            accessorKey: "recipe.name",
            header: "Receta",
            cell: ({ row }) => (
                <span className="font-medium">{row.original.recipe.name}</span>
            )
        },
        {
            accessorKey: "score",
            header: "Puntuación",
            cell: ({ row }) => {
                const score = row.original.score
                let variant: "default" | "destructive" | "secondary" | "outline" = "default"
                if (score < 50) variant = "destructive"
                else if (score < 80) variant = "secondary"

                return (
                    <Badge variant={variant}>
                        {score.toFixed(1)}%
                    </Badge>
                )
            }
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
                    <Button variant="ghost" size="sm" asChild disabled>
                        <span className="cursor-not-allowed flex items-center">
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </span>
                    </Button>
                )
            }
        }
    ]

    return <DataTable columns={columns} data={data} searchPlaceholder="Buscar auditorías..." />
}
