"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Button } from "@/modules/shared/ui/button"
import { Switch } from "@/modules/shared/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
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
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  toggleKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  deleteKnowledgeBaseBySource,
} from "@/modules/atc/actions/knowledge-base"
import { KnowledgeBaseDialog } from "./knowledge-base-dialog"
import type { KnowledgeBase, QueryCategory } from "@prisma/client"

const sourceLabels: Record<string, { label: string; className: string }> = {
  manual: { label: "Manual",  className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  staged: { label: "Staged",  className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  excel:  { label: "Excel",   className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  file:   { label: "Archivo", className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  gstock: { label: "GStock",  className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  n8n:    { label: "n8n",     className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
}

function ActionsCell({
  entry,
  categories,
}: {
  entry: KnowledgeBase
  categories: QueryCategory[]
}) {
  const [active, setActive] = useState(entry.active)
  const [toggling, setToggling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleToggle(value: boolean) {
    setToggling(true)
    setActive(value)
    try {
      const result = await toggleKnowledgeBaseEntry(entry.id, value)
      if (!result.success) {
        setActive(!value)
        toast.error("Error al actualizar")
      }
    } catch {
      setActive(!value)
      toast.error("Error inesperado")
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const result = await deleteKnowledgeBaseEntry(entry.id)
      if (result.success) {
        toast.success("Entrada eliminada")
        setDeleteOpen(false)
      } else {
        toast.error("Error al eliminar")
      }
    } catch {
      toast.error("Error inesperado")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <Switch
        checked={active}
        onCheckedChange={handleToggle}
        disabled={toggling}
        className="scale-75"
      />
      <KnowledgeBaseDialog categories={categories} entry={entry} mode="edit" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-7 w-7 p-0">
            <span className="sr-only">Acciones</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrada</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &ldquo;{entry.title}&rdquo;? Esta acción eliminará la entrada de la base de
              conocimiento y su vector de Pinecone. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface KBTableProps {
  data: KnowledgeBase[]
  categories: QueryCategory[]
}

export function KnowledgeBaseTable({ data, categories }: KBTableProps) {
  const [bulkDeleteSource, setBulkDeleteSource] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Contar entries por source para mostrar en el dropdown
  const sourceCounts = data.reduce<Record<string, number>>((acc, e) => {
    acc[e.source] = (acc[e.source] ?? 0) + 1
    return acc
  }, {})
  const deletableSources = Object.entries(sourceCounts).filter(
    ([src]) => src !== "manual"
  )

  async function handleBulkDelete() {
    if (!bulkDeleteSource) return
    setBulkDeleting(true)
    try {
      const result = await deleteKnowledgeBaseBySource(bulkDeleteSource)
      if (result.success) {
        toast.success(`${result.deleted} entradas eliminadas`)
        setBulkDeleteSource(null)
      } else {
        toast.error("Error al eliminar")
      }
    } catch {
      toast.error("Error inesperado")
    } finally {
      setBulkDeleting(false)
    }
  }

  const bulkCount = bulkDeleteSource ? (sourceCounts[bulkDeleteSource] ?? 0) : 0
  const bulkLabel = bulkDeleteSource ? (sourceLabels[bulkDeleteSource]?.label ?? bulkDeleteSource) : ""

  const columns: ColumnDef<KnowledgeBase>[] = [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.title}</p>
          {row.original.section && (
            <p className="text-xs text-muted-foreground">{row.original.section}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "content",
      header: "Contenido",
      cell: ({ row }) => (
        <p className="max-w-sm truncate text-xs text-muted-foreground">
          {row.original.content}
        </p>
      ),
    },
    {
      accessorKey: "categoryId",
      header: "Categoría",
      cell: ({ row }) => {
        const cat = categories.find(c => c.id === row.original.categoryId)
        return cat ? (
          <span className="text-xs text-muted-foreground">{cat.name}</span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )
      },
    },
    {
      accessorKey: "source",
      header: "Fuente",
      cell: ({ row }) => {
        const src = sourceLabels[row.original.source] ?? { label: row.original.source, className: "bg-gray-100 text-gray-800" }
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${src.className}`}>
            {src.label}
          </span>
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Actualizado",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.updatedAt).toLocaleDateString("es-ES")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ActionsCell entry={row.original} categories={categories} />
      ),
    },
  ]

  return (
    <div className="space-y-3">
      {deletableSources.length > 0 && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Borrado masivo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Borrar por fuente</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {deletableSources.map(([src, count]) => {
                const label = sourceLabels[src]?.label ?? src
                return (
                  <DropdownMenuItem
                    key={src}
                    onClick={() => setBulkDeleteSource(src)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {label} ({count} entradas)
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog
        open={!!bulkDeleteSource}
        onOpenChange={open => { if (!open && !bulkDeleting) setBulkDeleteSource(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entradas</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar {bulkCount} entrada{bulkCount !== 1 ? "s" : ""} de fuente &ldquo;{bulkLabel}&rdquo;?
              Esta acción también eliminará sus vectores de Pinecone y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkDeleting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : `Eliminar ${bulkCount} entrada${bulkCount !== 1 ? "s" : ""}`
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataTable
        columns={columns}
        data={data}
        searchKey="title"
        searchPlaceholder="Buscar en la base de conocimiento..."
      />
    </div>
  )
}
