"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Upload, Wand2, CheckCircle, Loader2, X, FileText,
  FileSpreadsheet, Shield, RefreshCw, File, Info,
} from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Badge } from "@/modules/shared/ui/badge"
import { Switch } from "@/modules/shared/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/shared/ui/tooltip"
import { publishStagedEntries, deleteKnowledgeBaseBySource } from "@/modules/atc/actions/knowledge-base"
import type { QueryCategory } from "@prisma/client"

// ── Tipos ────────────────────────────────────────────────────────

interface StagedEntry {
  title: string
  content: string
  section?: string
  categorySuggestion?: string
  categoryId?: string
  tokenCount?: number
  language?: string
  selected: boolean
}

interface ParsedSection {
  name: string
  headers?: string[]
  rows?: Record<string, string>[]
  text?: string
  rowCount: number
  preview: string
  format: "excel" | "pdf" | "csv"
}

interface KBImportPanelProps {
  categories: QueryCategory[]
}

// Mapeo sugerencia del LLM → código de categoría en DB
const SUGGESTION_TO_CODE: Record<string, string> = {
  espacios: "SPACES",
  alergenos: "ALLERGENS",
  accesibilidad: "ACCESSIBILITY",
  horarios: "SCHEDULES",
  menus: "MENUS",
  politicas: "POLICIES",
  general: "GENERAL",
  reservas: "RESERVATIONS",
  pagos: "PAYMENTS",
  eventos: "EVENTS",
  incidencias: "INCIDENTS",
}

function resolveCategoryId(
  suggestion: string | undefined,
  categories: QueryCategory[]
): string | undefined {
  if (!suggestion) return undefined
  const code = SUGGESTION_TO_CODE[suggestion.toLowerCase().trim()]
  if (!code) return undefined
  return categories.find(c => c.code === code)?.id
}

// ── Utilidades ───────────────────────────────────────────────────

function sectionToReadableText(section: ParsedSection): string {
  // PDF: devolver texto plano directamente
  if (section.text) {
    return `=== ${section.name} ===\n\n${section.text}`
  }

  // Excel / CSV: formatear filas como texto
  const lines: string[] = [`=== ${section.name} ===`]
  const cleanHeaders = (section.headers ?? []).map((h, i) =>
    h.startsWith("__EMPTY") ? `Columna ${i + 1}` : h
  )
  lines.push(`Columnas: ${cleanHeaders.join(" | ")}`)
  lines.push("")

  for (let i = 0; i < (section.rows ?? []).length; i++) {
    const row = (section.rows ?? [])[i]
    const fields = (section.headers ?? [])
      .map((h, idx) => {
        const val = row[h]?.trim()
        if (!val) return null
        return `- ${cleanHeaders[idx]}: ${val}`
      })
      .filter(Boolean)
      .join("\n")
    if (fields) {
      lines.push(`Fila ${i + 1}:\n${fields}\n`)
    }
  }

  return lines.join("\n")
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const lines = text.split("\n")
  const chunks: string[] = []
  let current = ""

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && current.length > 0) {
      chunks.push(current)
      current = ""
    }
    current += (current ? "\n" : "") + line
  }
  if (current.trim()) chunks.push(current)
  return chunks
}

// ── Iconos por formato ────────────────────────────────────────────

function FormatIcon({ format, className }: { format: ParsedSection["format"]; className?: string }) {
  if (format === "excel") return <FileSpreadsheet className={className ?? "h-4 w-4 text-emerald-600"} />
  if (format === "pdf")   return <FileText className={className ?? "h-4 w-4 text-red-600"} />
  return <File className={className ?? "h-4 w-4 text-blue-600"} />
}

const ACCEPTED_EXTENSIONS = /\.(xlsx|xls|pdf|csv)$/i
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// ── Componente ───────────────────────────────────────────────────

export function KBImportPanel({ categories }: KBImportPanelProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("texto")

  // Shared state
  const [staged, setStaged] = useState<StagedEntry[]>([])
  const [publishing, setPublishing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [replaceMode, setReplaceMode] = useState(false)

  // Text tab state
  const [rawText, setRawText] = useState("")
  const [normalizing, setNormalizing] = useState(false)

  // File tab state
  const [file, setFile] = useState<File | null>(null)
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([])
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set())
  const [anonymizeSections, setAnonymizeSections] = useState<Set<number>>(new Set())
  const [parsingFile, setParsingFile] = useState(false)
  const [normalizingFile, setNormalizingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileProgress, setFileProgress] = useState<{ current: number; total: number } | null>(null)
  const [fileFormat, setFileFormat] = useState<ParsedSection["format"] | null>(null)

  // ── Handlers texto ───────────────────────────────────────────

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
        (entries as Omit<StagedEntry, "selected">[]).map(e => ({
          ...e,
          categoryId: resolveCategoryId(e.categorySuggestion, categories),
          selected: true,
        }))
      )
      toast.success(`${entries.length} entradas generadas. Revisa y publica.`)
    } catch {
      toast.error("Error al normalizar con IA")
    } finally {
      setNormalizing(false)
    }
  }

  // ── Handlers archivo ─────────────────────────────────────────

  function handleFileDrop(dropped: File) {
    if (!dropped.name.match(ACCEPTED_EXTENSIONS)) {
      toast.error("Formato no soportado. Usa .xlsx, .xls, .pdf o .csv")
      return
    }
    if (dropped.size > MAX_FILE_SIZE) {
      toast.error("El archivo no puede superar 10MB")
      return
    }
    setFile(dropped)
    setParsedSections([])
    setSelectedSections(new Set())
    setAnonymizeSections(new Set())
    setFileFormat(null)
  }

  async function handleParseFile(anonymize = anonymizeSections) {
    if (!file) return
    setParsingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("anonymize", JSON.stringify(Array.from(anonymize)))

      const res = await fetch("/api/atc/knowledge-base/parse-file", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error parseando archivo")
      }
      const { sections, format } = await res.json() as {
        sections: ParsedSection[]
        format: ParsedSection["format"]
      }
      setParsedSections(sections)
      setFileFormat(format)
      // Seleccionar todas las secciones no vacías por defecto
      setSelectedSections(new Set(
        sections.map((s, i) => s.rowCount > 0 ? i : -1).filter(i => i >= 0)
      ))
      toast.success(`${sections.length} sección(es) detectada(s)`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al analizar el archivo")
    } finally {
      setParsingFile(false)
    }
  }

  async function handleNormalizeFile() {
    const selected = parsedSections.filter((_, i) => selectedSections.has(i))
    if (!selected.length) {
      toast.error("Selecciona al menos una sección")
      return
    }

    setNormalizingFile(true)
    setStaged([])

    try {
      const allEntries: StagedEntry[] = []

      const sectionTexts = selected.map(s => ({
        name: s.name,
        chunks: splitTextIntoChunks(sectionToReadableText(s), 12000),
      }))
      let totalChunks = 0
      for (const st of sectionTexts) totalChunks += st.chunks.length
      setFileProgress({ current: 0, total: totalChunks })

      let processed = 0
      for (const { chunks } of sectionTexts) {
        for (const chunk of chunks) {
          const res = await fetch("/api/atc/knowledge-base/normalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: chunk, source: "file" }),
          })
          if (!res.ok) {
            console.error("[normalize-file] chunk failed:", await res.text())
            processed++
            setFileProgress({ current: processed, total: totalChunks })
            continue
          }
          const { entries } = await res.json()
          allEntries.push(
            ...(entries as Omit<StagedEntry, "selected">[]).map(e => ({
              ...e,
              categoryId: resolveCategoryId(e.categorySuggestion, categories),
              selected: true,
            }))
          )
          processed++
          setFileProgress({ current: processed, total: totalChunks })
        }
      }

      setStaged(allEntries)
      if (allEntries.length) {
        toast.success(`${allEntries.length} entradas generadas de ${selected.length} sección(es). Revisa y publica.`)
      } else {
        toast.error("No se generaron entradas. Intenta con otro archivo.")
      }
    } catch {
      toast.error("Error al normalizar contenido del archivo")
    } finally {
      setNormalizingFile(false)
      setFileProgress(null)
    }
  }

  // ── Handlers compartidos ─────────────────────────────────────

  async function handlePublish() {
    const toPublish = staged.filter(e => e.selected)
    if (!toPublish.length) {
      toast.error("No hay entradas seleccionadas")
      return
    }
    setPublishing(true)
    setProgress({ current: 0, total: toPublish.length })

    const source = activeTab === "archivo" ? "file" : "staged"
    const BATCH_SIZE = 10
    let totalCreated = 0
    let totalSkipped = 0
    let failed = 0

    try {
      if (replaceMode) {
        try {
          const delResult = await deleteKnowledgeBaseBySource(source)
          if (delResult.success && delResult.deleted > 0) {
            toast.info(`${delResult.deleted} entradas anteriores eliminadas`)
          }
        } catch (e) {
          console.error("[publish] Error deleting old entries:", e)
          toast.error("Error al eliminar entradas anteriores")
        }
      }

      for (let i = 0; i < toPublish.length; i += BATCH_SIZE) {
        const batch = toPublish.slice(i, i + BATCH_SIZE)
        try {
          const result = await publishStagedEntries(
            batch.map(e => ({
              title:      e.title,
              content:    e.content,
              section:    e.section,
              categoryId: e.categoryId,
              language:   e.language ?? "es",
            })),
            source
          )
          if (result.success) {
            totalCreated += result.created ?? batch.length
            totalSkipped += result.skipped ?? 0
          } else {
            failed += batch.length
          }
        } catch (e) {
          console.error(`[publish] Batch ${i}-${i + batch.length} failed:`, e)
          failed += batch.length
        }
        setProgress({ current: Math.min(i + BATCH_SIZE, toPublish.length), total: toPublish.length })
      }

      if (totalCreated > 0 || totalSkipped > 0) {
        const parts: string[] = []
        if (totalCreated > 0) parts.push(`${totalCreated} publicadas`)
        if (totalSkipped > 0) parts.push(`${totalSkipped} duplicadas omitidas`)
        if (failed > 0) parts.push(`${failed} fallidas`)
        toast.success(parts.join(", "))
        handleReset()
      } else {
        toast.error("No se pudo publicar ninguna entrada")
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

  function handleReset() {
    setStaged([])
    setRawText("")
    setFile(null)
    setParsedSections([])
    setSelectedSections(new Set())
    setAnonymizeSections(new Set())
    setFileFormat(null)
    setReplaceMode(false)
    setOpen(false)
  }

  const selectedCount = staged.filter(e => e.selected).length

  // ── Render ───────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 sm:h-9">
          <Upload className="sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Importar contenido</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-200 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            Importar y normalizar contenido
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {staged.length === 0 ? (
            /* ── FASE DE ENTRADA ── */
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="texto">
                  <FileText className="h-4 w-4 mr-1.5" />
                  Texto
                </TabsTrigger>
                <TabsTrigger value="archivo">
                  <Upload className="h-4 w-4 mr-1.5" />
                  Archivo
                </TabsTrigger>
              </TabsList>

              {/* ── Tab Texto ── */}
              <TabsContent value="texto">
                <div className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">
                    Pega el contenido del documento que quieras incorporar a la base de conocimiento.
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
              </TabsContent>

              {/* ── Tab Archivo ── */}
              <TabsContent value="archivo">
                <div className="space-y-3 pt-3">
                  {parsedSections.length === 0 ? (
                    /* Subfase A: subida de archivo */
                    <>
                      <p className="text-sm text-muted-foreground">
                        Sube un archivo para importar su contenido a la base de conocimiento.
                        La IA interpretará el contenido automáticamente.
                      </p>
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => {
                          e.preventDefault()
                          setDragOver(false)
                          const dropped = e.dataTransfer.files[0]
                          if (dropped) handleFileDrop(dropped)
                        }}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex justify-center gap-2 mb-3">
                          <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                          <FileText className="h-8 w-8 text-red-500" />
                          <File className="h-8 w-8 text-blue-500" />
                        </div>
                        <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Excel (.xlsx / .xls) · PDF (.pdf) · CSV (.csv) · Máx. 10MB
                          </p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                Solo se extrae texto de celdas y documentos. Las imágenes,
                                gráficos y objetos embebidos no se procesan. Si tu archivo
                                contiene información en imágenes, pégala manualmente en la
                                pestaña &ldquo;Texto&rdquo;.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <label className="mt-3 inline-block">
                          <input
                            type="file"
                            accept=".xlsx,.xls,.pdf,.csv"
                            className="hidden"
                            onChange={e => {
                              const dropped = e.target.files?.[0]
                              if (dropped) handleFileDrop(dropped)
                            }}
                          />
                          <span className="text-sm text-primary underline cursor-pointer">
                            Selecciona archivo
                          </span>
                        </label>
                        {file && (
                          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                            <FormatIcon format={fileFormat ?? "excel"} className="h-4 w-4" />
                            <span className="font-medium">{file.name}</span>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setFile(null) }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleParseFile()}
                        disabled={!file || parsingFile}
                        className="w-full"
                      >
                        {parsingFile
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando archivo...</>
                          : <><Wand2 className="mr-2 h-4 w-4" /> Analizar archivo</>
                        }
                      </Button>
                    </>
                  ) : (
                    /* Subfase B: preview de secciones */
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {parsedSections.length} sección(es) en{" "}
                          <span className="text-primary">{file?.name}</span>
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setParsedSections([]); setFile(null); setFileFormat(null) }}
                        >
                          <X className="mr-1 h-4 w-4" /> Cambiar archivo
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {parsedSections.map((section, idx) => (
                          <div key={idx} className={`rounded-lg border p-3 transition-colors ${
                            selectedSections.has(idx) ? "border-primary/30 bg-primary/5" : "border-border opacity-60"
                          }`}>
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSections(prev => {
                                    const next = new Set(prev)
                                    next.has(idx) ? next.delete(idx) : next.add(idx)
                                    return next
                                  })
                                }}
                                className="mt-0.5 shrink-0"
                              >
                                {selectedSections.has(idx)
                                  ? <CheckCircle className="h-4 w-4 text-primary" />
                                  : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <FormatIcon format={section.format} />
                                  <span className="font-medium text-sm">{section.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {section.format === "pdf"
                                      ? `${section.rowCount} pág.`
                                      : `${section.rowCount} filas`}
                                  </Badge>
                                  {section.headers && (
                                    <Badge variant="outline" className="text-xs">
                                      {section.headers.length} columnas
                                    </Badge>
                                  )}
                                </div>

                                {section.headers && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    Columnas: {section.headers.map((h, hi) =>
                                      h.startsWith("__EMPTY") ? `Col ${hi + 1}` : h
                                    ).join(", ")}
                                  </p>
                                )}

                                {/* Toggle anonimización */}
                                <div className="flex items-center gap-2 mt-2">
                                  <Switch
                                    id={`anon-${idx}`}
                                    checked={anonymizeSections.has(idx)}
                                    onCheckedChange={(checked) => {
                                      setAnonymizeSections(prev => {
                                        const next = new Set(prev)
                                        checked ? next.add(idx) : next.delete(idx)
                                        return next
                                      })
                                    }}
                                  />
                                  <label htmlFor={`anon-${idx}`} className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                                    <Shield className="h-3 w-3" />
                                    Anonimizar datos personales
                                  </label>
                                </div>

                                {/* Preview colapsable */}
                                {section.preview && section.preview !== "(vacía)" && section.preview !== "(sin datos)" && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                      Ver preview
                                    </summary>
                                    <pre className="mt-1 text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-40">
                                      {section.preview}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Re-parsear con anonimización si hay cambios */}
                      {anonymizeSections.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleParseFile(anonymizeSections)}
                          disabled={parsingFile}
                          className="w-full"
                        >
                          {parsingFile
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aplicando anonimización...</>
                            : <><Shield className="mr-2 h-4 w-4" /> Aplicar anonimización y re-analizar</>
                          }
                        </Button>
                      )}

                      {fileProgress && (
                        <div className="text-xs text-muted-foreground text-center">
                          Normalizando lote {fileProgress.current}/{fileProgress.total}...
                        </div>
                      )}

                      <Button
                        onClick={handleNormalizeFile}
                        disabled={normalizingFile || !selectedSections.size}
                        className="w-full"
                      >
                        {normalizingFile
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando chunks con IA...</>
                          : <><Wand2 className="mr-2 h-4 w-4" /> Generar chunks de {selectedSections.size} sección(es)</>
                        }
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* ── FASE DE REVISIÓN (chunks editables) ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {staged.length} entradas generadas — {selectedCount} seleccionadas
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStaged([])}>
                  <X className="mr-1 h-4 w-4" /> Volver
                </Button>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-2">
                <Switch
                  id="replace-mode"
                  checked={replaceMode}
                  onCheckedChange={setReplaceMode}
                />
                <label htmlFor="replace-mode" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3" />
                  Reemplazar importación anterior
                  <span className="text-amber-600 dark:text-amber-400">
                    (borra entries &ldquo;{activeTab === "archivo" ? "file" : "staged"}&rdquo; existentes)
                  </span>
                </label>
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
                      <div className="flex items-center gap-2">
                        <Input
                          value={entry.title}
                          onChange={e => updateEntry(i, "title", e.target.value)}
                          placeholder="Título"
                          className="h-7 text-sm font-medium flex-1"
                        />
                        {entry.language && (
                          <Badge variant="outline" className="text-xs uppercase shrink-0">
                            {entry.language}
                          </Badge>
                        )}
                      </div>
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
                      <div className="flex items-center gap-3">
                        {entry.tokenCount && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            ~{entry.tokenCount} tokens
                          </p>
                        )}
                        {entry.categorySuggestion && (
                          <Badge variant="secondary" className="text-xs">
                            {entry.categorySuggestion}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer publicar ── */}
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
