"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/shared/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from "@/modules/shared/ui/input"
import { Textarea } from "@/modules/shared/ui/textarea"
import { Switch } from "@/modules/shared/ui/switch"
import { Checkbox } from "@/modules/shared/ui/checkbox"
import { knowledgeBaseSchema, type KnowledgeBaseFormValues } from "@/modules/rag/domain/schemas"
import { createKBEntry, updateKBEntry } from "@/modules/rag/actions/knowledge-base"
import { getAllKBDomains } from "@/modules/rag/domain/domains"
import type { KnowledgeBase, QueryCategory } from "@prisma/client"

interface KnowledgeBaseDialogProps {
  domain: string
  categories: QueryCategory[]
  entry?: KnowledgeBase
  mode?: "create" | "edit"
  showDomainsSelector?: boolean
}

export function KnowledgeBaseDialog({
  domain,
  categories,
  entry,
  mode = "create",
  showDomainsSelector = false,
}: KnowledgeBaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const allDomains = showDomainsSelector ? getAllKBDomains() : []

  const form = useForm<KnowledgeBaseFormValues>({
    resolver: zodResolver(knowledgeBaseSchema) as any,
    defaultValues: {
      title:      entry?.title ?? "",
      content:    entry?.content ?? "",
      section:    entry?.section ?? "",
      categoryId: entry?.categoryId ?? "",
      source:     entry?.source ?? "manual",
      active:     entry?.active ?? true,
      domains:    showDomainsSelector ? (entry?.domains ?? [domain]) : undefined,
    },
  })

  useEffect(() => {
    if (open && entry) {
      form.reset({
        title:      entry.title,
        content:    entry.content,
        section:    entry.section ?? "",
        categoryId: entry.categoryId ?? "",
        source:     entry.source,
        active:     entry.active,
        domains:    showDomainsSelector ? entry.domains : undefined,
      })
    }
  }, [open, entry, form, showDomainsSelector])

  async function onSubmit(data: KnowledgeBaseFormValues) {
    setLoading(true)
    try {
      const result = entry
        ? await updateKBEntry(domain, entry.id, data)
        : await createKBEntry(domain, data)

      if (result.success) {
        toast.success(entry ? "Entrada actualizada" : "Entrada creada")
        form.reset()
        setOpen(false)
      } else {
        toast.error("Error al guardar la entrada")
      }
    } catch {
      toast.error("Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm" className="h-8 sm:h-9">
            <Plus className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva entrada</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva entrada de conocimiento" : "Editar entrada"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Terraza exterior — capacidad y horario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seccion</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Espacios exteriores" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "none" ? undefined : v)} value={field.value ?? "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin categoria</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el contenido relevante para el sistema RAG..."
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Max. 3000 caracteres. Cada entrada representa un chunk de conocimiento (300-500 tokens ideal).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showDomainsSelector && allDomains.length > 1 && (
              <FormField
                control={form.control}
                name="domains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dominios</FormLabel>
                    <div role="group" aria-label="Seleccionar dominios" className="flex flex-wrap gap-3">
                      {allDomains.map(d => {
                        const checked = (field.value ?? []).includes(d.id)
                        return (
                          <label
                            key={d.id}
                            className="flex items-center gap-2 cursor-pointer min-h-11"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const current = field.value ?? []
                                if (v) {
                                  field.onChange([...current, d.id])
                                } else {
                                  const next = current.filter(id => id !== d.id)
                                  if (next.length > 0) field.onChange(next)
                                }
                              }}
                              aria-label={d.label}
                            />
                            <span className="text-sm">{d.label}</span>
                          </label>
                        )
                      })}
                    </div>
                    <FormDescription>
                      Selecciona en que dominios estara disponible esta entrada.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Activa en el RAG</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Generando embedding..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
