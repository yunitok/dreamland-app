"use client"

import { useState, useTransition } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Badge } from "@/modules/shared/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { TiptapEditor } from "./tiptap-editor"
import {
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/modules/atc/actions/email-templates"
import { toast } from "sonner"

type TemplateRow = {
  id: string
  name: string
  subject: string
  bodyHtml: string
  isActive: boolean
  sortOrder: number
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
  author: { id: string; name: string | null } | null
}

type CategoryOption = {
  id: string
  name: string
  color: string
}

interface EmailTemplateManagerProps {
  templates: TemplateRow[]
  categories: CategoryOption[]
}

export function EmailTemplateManager({ templates, categories }: EmailTemplateManagerProps) {
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [sortOrder, setSortOrder] = useState(0)

  function openCreate() {
    setName("")
    setSubject("")
    setBodyHtml("")
    setCategoryId("")
    setSortOrder(0)
    setIsCreating(true)
    setEditingTemplate(null)
  }

  function openEdit(t: TemplateRow) {
    setName(t.name)
    setSubject(t.subject)
    setBodyHtml(t.bodyHtml)
    setCategoryId(t.categoryId ?? "")
    setSortOrder(t.sortOrder)
    setEditingTemplate(t)
    setIsCreating(true)
  }

  function closeDialog() {
    setIsCreating(false)
    setEditingTemplate(null)
  }

  function handleSave() {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      toast.error("Nombre, asunto y contenido son obligatorios")
      return
    }

    startTransition(async () => {
      const data = {
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml,
        categoryId: categoryId || undefined,
        isActive: true,
        sortOrder,
      }

      const result = editingTemplate
        ? await updateEmailTemplate(editingTemplate.id, data)
        : await createEmailTemplate(data)

      if (result.success) {
        toast.success(editingTemplate ? "Plantilla actualizada" : "Plantilla creada")
        closeDialog()
      } else {
        toast.error(result.error ?? "Error al guardar")
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteEmailTemplate(deleteTarget)
      if (result.success) {
        toast.success("Plantilla eliminada")
      } else {
        toast.error(result.error ?? "Error al eliminar")
      }
      setDeleteTarget(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay plantillas. Crea la primera para agilizar las respuestas.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{t.name}</p>
                  {!t.isActive && (
                    <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>
                  )}
                  {t.category && (
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: t.category.color + "22",
                        color: t.category.color,
                      }}
                    >
                      {t.category.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Asunto: {t.subject}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => setDeleteTarget(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Confirmación de reserva" />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría (opcional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin categoría</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Asunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del email" />
              <p className="text-xs text-muted-foreground">
                Variables: {"{nombre}"}, {"{fecha}"}, {"{asunto}"}, {"{email}"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Contenido</Label>
              <TiptapEditor
                content={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Escribe el contenido de la plantilla..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Orden</Label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-24"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeDialog} className="cursor-pointer">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isPending} className="gap-2 cursor-pointer">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTemplate ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              Esta plantilla se desactivará y no aparecerá en el selector.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
