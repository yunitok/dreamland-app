"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/modules/shared/ui/badge"
import { DataTable } from "@/modules/shared/ui/data-table"
import { RecipeWithRelations } from "@/modules/sherlock/actions/recipes"
import { Link } from "@/i18n/navigation"
import { Button } from "@/modules/shared/ui/button"
import { Edit, MoreHorizontal, ChefHat } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"

const statusMap = {
    DRAFT: { label: "Borrador", variant: "outline" as const },
    ACTIVE: { label: "Activa", variant: "default" as const },
    ARCHIVED: { label: "Archivada", variant: "secondary" as const },
}

const columns: ColumnDef<RecipeWithRelations>[] = [
    {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{row.getValue("name")}</span>
            </div>
        ),
    },
    {
        accessorKey: "category.name",
        header: "Categoría",
        cell: ({ row }) => row.original.category ? <Badge variant="secondary">{row.original.category.name}</Badge> : '-',
    },
    {
        accessorKey: "family.name",
        header: "Familia",
        cell: ({ row }) => row.original.family?.name || '-',
    },
    {
        accessorKey: "theoreticalCost",
        header: "Coste Teórico",
        cell: ({ row }) => {
            const cost = row.getValue("theoreticalCost") as number
            if (!cost) return '-'
            return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cost)
        }
    },
    {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
            const status = row.getValue("status") as keyof typeof statusMap
            const config = statusMap[status] || { label: status, variant: "outline" as const }
            return <Badge variant={config.variant}>{config.label}</Badge>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const recipe = row.original

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
                            <Link href={`/sherlock/recipes/${recipe.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]

interface RecipesTableProps {
    data: RecipeWithRelations[]
}

export function RecipesTable({ data }: RecipesTableProps) {
    return <DataTable columns={columns} data={data} searchPlaceholder="Buscar recetas..." />
}
