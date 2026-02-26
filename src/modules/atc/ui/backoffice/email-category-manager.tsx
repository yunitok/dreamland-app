"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/modules/shared/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/modules/shared/ui/form"
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
import { Badge } from "@/modules/shared/ui/badge"
import { Checkbox } from "@/modules/shared/ui/checkbox"
import { Plus, Pencil, Trash2, Tag, Bell } from "lucide-react"
import { toast } from "sonner"
import {
  createEmailCategory,
  updateEmailCategory,
  deleteEmailCategory,
} from "@/modules/atc/actions/backoffice"
import {
  emailCategorySchema,
  type EmailCategoryFormValues,
} from "@/modules/atc/domain/schemas"

type Category = {
  id:          string
  name:        string
  slug:        string
  description: string | null
  color:       string
  icon:        string | null
  parentId:    string | null
  isActive:    boolean
  sortOrder:   number
  notifyRoles: string[]
  parent:      { name: string } | null
  _count:      { emails: number }
}

type RoleInfo = {
  code: string
  name: string
}

interface EmailCategoryManagerProps {
  categories: Category[]
  roles: RoleInfo[]
}

export function EmailCategoryManager({ categories: initialCategories, roles }: EmailCategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [editing, setEditing]             = useState<Category | null>(null)
  const [, startTransition] = useTransition()

  const form = useForm<EmailCategoryFormValues>({
    resolver: zodResolver(emailCategorySchema) as any,
    defaultValues: {
      name:      "",
      slug:      "",
      description: "",
      color:     "#6B7280",
      icon:      "",
      parentId:  "",
      isActive:  true,
      sortOrder: 0,
      notifyRoles: [],
    },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: "", slug: "", description: "", color: "#6B7280", icon: "", parentId: "", isActive: true, sortOrder: 0, notifyRoles: [] })
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset({
      name:        cat.name,
      slug:        cat.slug,
      description: cat.description ?? "",
      color:       cat.color,
      icon:        cat.icon ?? "",
      parentId:    cat.parentId ?? "",
      isActive:    cat.isActive,
      sortOrder:   cat.sortOrder,
      notifyRoles: cat.notifyRoles ?? [],
    })
    setDialogOpen(true)
  }

  // Auto-generate slug from name
  function handleNameChange(name: string) {
    form.setValue("name", name)
    if (!editing) {
      const slug = name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s_]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 50)
      form.setValue("slug", slug)
    }
  }

  function onSubmit(data: EmailCategoryFormValues) {
    startTransition(async () => {
      const result = editing
        ? await updateEmailCategory(editing.id, data)
        : await createEmailCategory(data)

      if (result.success) {
        toast.success(editing ? "Categoría actualizada" : "Categoría creada")
        setDialogOpen(false)
        // Refresh page to get updated data
        window.location.reload()
      } else {
        toast.error(result.error ?? "Error al guardar la categoría")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteEmailCategory(id)
      if (result.success) {
        toast.success("Categoría desactivada")
        setCategories(prev => prev.filter(c => c.id !== id))
        setDeleteId(null)
      } else {
        toast.error(result.error ?? "Error al eliminar la categoría")
      }
    })
  }

  // Separate parent and child categories
  const parents  = categories.filter(c => !c.parentId)
  const children = categories.filter(c => !!c.parentId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} categorías activas
        </p>
        <Button onClick={openCreate} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {/* Categorías padre */}
      {parents.map(parent => (
        <div key={parent.id} className="space-y-1">
          <div className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: parent.color }}
              >
                <Tag className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{parent.name}</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{parent.slug}</code>
                  <Badge variant="secondary" className="text-xs">{parent._count.emails} emails</Badge>
                  {parent.notifyRoles?.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Bell className="h-3 w-3" />
                      {parent.notifyRoles.length} rol(es)
                    </Badge>
                  )}
                </div>
                {parent.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{parent.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => openEdit(parent)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                onClick={() => setDeleteId(parent.id)}
                disabled={parent._count.emails > 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Subcategorías */}
          {children.filter(c => c.parentId === parent.id).map(child => (
            <div key={child.id} className="ml-6 flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0"
                  style={{ backgroundColor: child.color + "33", border: `1px solid ${child.color}66` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: child.color }} />
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{child.name}</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{child.slug}</code>
                  <Badge variant="outline" className="text-xs">{child._count.emails}</Badge>
                  {child.notifyRoles?.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Bell className="h-3 w-3" />
                      {child.notifyRoles.length} rol(es)
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(child)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => setDeleteId(child.id)}
                  disabled={child._count.emails > 0}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Dialog de creación/edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={e => handleNameChange(e.target.value)}
                          placeholder="Ej: Reservas"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="reservas" className="font-mono text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Descripción para el sistema de clasificación" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={e => field.onChange(e.target.value)}
                            className="h-9 w-9 rounded border cursor-pointer"
                          />
                          <Input {...field} className="font-mono text-xs" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icono Lucide</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CalendarDays" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orden</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría padre (opcional)</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={v => field.onChange(v === "none" ? null : v)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin categoría padre (nivel raíz)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría padre</SelectItem>
                        {parents
                          .filter(p => p.id !== editing?.id)
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notificar a otros roles */}
              <FormField
                control={form.control}
                name="notifyRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificar a otros departamentos
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Los usuarios con estos roles recibirán una notificación cuando llegue un email de esta categoría
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {roles.map(role => (
                        <label
                          key={role.code}
                          className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={field.value?.includes(role.code) ?? false}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? []
                              field.onChange(
                                checked
                                  ? [...current, role.code]
                                  : current.filter((r: string) => r !== role.code)
                              )
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">{role.name}</span>
                            <code className="text-xs text-muted-foreground">{role.code}</code>
                          </div>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                  Cancelar
                </Button>
                <Button type="submit" className="cursor-pointer">
                  {editing ? "Guardar cambios" : "Crear categoría"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmación de borrado */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              La categoría se desactivará y no aparecerá en la clasificación. Los emails asociados conservarán su categoría actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
