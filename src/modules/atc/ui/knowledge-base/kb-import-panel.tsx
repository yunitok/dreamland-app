"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Upload, Wand2, CheckCircle, Loader2, X, FileText } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { Textarea } from "@/modules/shared/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/shared/ui/dialog"
import { Input } from "@/modules/shared/ui/input"
import { publishStagedEntries } from "@/modules/atc/actions/knowledge-base"
import type { QueryCategory } from "@prisma/client"

interface StagedEntry {
  title: string
  content: string
  section?: string
  categorySuggestion?: string
  categoryId?: string
  tokenCount?: number
  selected: boolean
}

interface KBImportPanelProps {
  categories: QueryCategory[]
}

export function KBImportPanel({ categories }: KBImportPanelProps) {
  const [open, setOpen] = useState(false)
  const [rawText, setRawText] = useState("")
  const [normalizing, setNormalizing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [staged, setStaged] = useState<StagedEntry[]>([])
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  async function handleNormalize() {
    if (!rawText.trim()) {
      toast.error("Introduce texto para normalizar")
      return
    }
    setNormalizing(true)
    setStaged([])
    try {
      const res = await fetch("/api/atc/knowledge-base/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      })
      if (!res.ok) throw new Error("Error normalizando")
      const { entries } = await res.json()
      setStaged(
        (entries as Omit<StagedEntry, "selected">[]).map(e => ({ ...e, selected: true }))
      )
      toast.success(`${entries.length} entradas generadas. Revisa y publica.`)
    } catch {
      toast.error("Error al normalizar con IA")
    } finally {
      setNormalizing(false)
    }
  }

  async function handlePublish() {
    const toPublish = staged.filter(e => e.selected)
    if (!toPublish.length) {
      toast.error("No hay entradas seleccionadas")
      return
    }
    setPublishing(true)
    setProgress({ current: 0, total: toPublish.length })
    try {
      const result = await publishStagedEntries(
        toPublish.map(e => ({
          title:      e.title,
          content:    e.content,
          section:    e.section,
          categoryId: e.categoryId,
        }))
      )
      if (result.success) {
        toast.success(`${result.created} entradas publicadas en la base de conocimiento`)
        setStaged([])
        setRawText("")
        setOpen(false)
      } else {
        toast.error("Error al publicar")
      }
    } catch {
      toast.error("Error inesperado")
    } finally {
      setPublishing(false)
      setProgress(null)
    }
  }

  function toggleEntry(i: number) {
    setStaged(prev => prev.map((e, idx) => idx === i ? { ...e, selected: !e.selected } : e))
  }

  function updateEntry(i: number, field: keyof StagedEntry, value: string) {
    setStaged(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const selectedCount = staged.filter(e => e.selected).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 sm:h-9">
          <Upload className="sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Importar contenido</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            Importar y normalizar contenido
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {staged.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pega el contenido del Excel, PDF o documento que quieras incorporar a la base de conocimiento.
                La IA lo dividirá en chunks bien estructurados.
              </p>
              <Textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Pega aquí el texto a normalizar: información de espacios, alérgenos, horarios, accesibilidad..."
                rows={12}
                className="font-mono text-xs"
              />
              <Button onClick={handleNormalize} disabled={normalizing} className="w-full">
                {normalizing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Normalizando con IA...</>
                  : <><Wand2 className="mr-2 h-4 w-4" /> Normalizar con IA</>
                }
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {staged.length} entradas generadas — {selectedCount} seleccionadas
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStaged([])}>
                  <X className="mr-1 h-4 w-4" /> Volver
                </Button>
              </div>

              {staged.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 space-y-2 transition-colors ${
                    entry.selected ? "border-primary/30 bg-primary/5" : "border-border opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleEntry(i)}
                      className="mt-0.5 shrink-0"
                    >
                      {entry.selected
                        ? <CheckCircle className="h-4 w-4 text-primary" />
                        : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      }
                    </button>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={entry.title}
                        onChange={e => updateEntry(i, "title", e.target.value)}
                        placeholder="Título"
                        className="h-7 text-sm font-medium"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={entry.section ?? ""}
                          onChange={e => updateEntry(i, "section", e.target.value)}
                          placeholder="Sección (opcional)"
                          className="h-7 text-xs"
                        />
                        <select
                          value={entry.categoryId ?? ""}
                          onChange={e => updateEntry(i, "categoryId", e.target.value)}
                          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="">Sin categoría</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <Textarea
                        value={entry.content}
                        onChange={e => updateEntry(i, "content", e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                      {entry.tokenCount && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          ~{entry.tokenCount} tokens
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {staged.length > 0 && (
          <div className="pt-3 border-t">
            {progress && (
              <div className="mb-2 text-xs text-muted-foreground text-center">
                Generando embeddings {progress.current}/{progress.total}...
              </div>
            )}
            <Button
              onClick={handlePublish}
              disabled={publishing || !selectedCount}
              className="w-full"
            >
              {publishing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando y generando embeddings...</>
                : <>Publicar {selectedCount} entrada{selectedCount !== 1 ? "s" : ""}</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
