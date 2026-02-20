import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
// pdf-parse no tiene default export en ESM — usar require para evitar error de Turbopack
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>

export const runtime = "nodejs"

// ── Regex de anonimización ────────────────────────────────────────
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(\+34|0034)?[\s.-]?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/g
const DNI_RE   = /\b\d{8}[A-Z]\b/gi
const NIE_RE   = /\b[XYZ]\d{7}[A-Z]\b/gi

function anonymize(text: string): string {
  return text
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_RE, "[TELÉFONO]")
    .replace(DNI_RE, "[DNI]")
    .replace(NIE_RE, "[NIE]")
}

// ── Interfaz de salida ────────────────────────────────────────────

export interface ParsedSection {
  name: string
  headers?: string[]
  rows?: Record<string, string>[]
  text?: string
  rowCount: number
  preview: string
  format: "excel" | "pdf" | "csv"
}

// ── Helpers ───────────────────────────────────────────────────────

function formatTablePreview(headers: string[], rows: Record<string, string>[]): string {
  const previewRows = rows.slice(0, 3)
  return previewRows.map((row, i) => {
    const fields = headers
      .map(h => {
        const val = row[h]?.trim()
        if (!val) return null
        const label = h.startsWith("__EMPTY") ? `Col ${headers.indexOf(h) + 1}` : h
        const truncated = val.length > 120 ? val.slice(0, 120) + "..." : val
        return `  ${label}: ${truncated}`
      })
      .filter(Boolean)
      .join("\n")
    return `Fila ${i + 1}:\n${fields}`
  }).join("\n\n")
}

// ── Parsers ───────────────────────────────────────────────────────

function parseExcel(buffer: ArrayBuffer, sectionsToAnonymize: Set<number>): ParsedSection[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellText: true, cellDates: true })

  return workbook.SheetNames.map((sheetName, sheetIdx): ParsedSection => {
    const worksheet = workbook.Sheets[sheetName]
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      defval: "",
      raw: false,
    })

    if (!jsonRows.length) {
      return { name: sheetName, headers: [], rows: [], rowCount: 0, preview: "(vacía)", format: "excel" }
    }

    const headers = Object.keys(jsonRows[0])
    let rows = jsonRows.filter(row => Object.values(row).some(v => v?.toString().trim()))

    if (sectionsToAnonymize.has(sheetIdx)) {
      rows = rows.map(row => {
        const clean: Record<string, string> = {}
        for (const [k, v] of Object.entries(row)) {
          clean[k] = typeof v === "string" ? anonymize(v) : String(v ?? "")
        }
        return clean
      })
    }

    return {
      name: sheetName,
      headers,
      rows,
      rowCount: rows.length,
      preview: formatTablePreview(headers, rows),
      format: "excel",
    }
  })
}

async function parsePdf(buffer: Buffer, shouldAnonymize: boolean): Promise<ParsedSection[]> {
  const data = await pdf(buffer)
  let text = data.text

  if (shouldAnonymize) {
    text = anonymize(text)
  }

  // Limpiar saltos de línea excesivos
  text = text.replace(/\n{3,}/g, "\n\n").trim()

  const numPages = data.numpages
  const preview = text.slice(0, 500) + (text.length > 500 ? "..." : "")

  // Si el PDF tiene ≤10 páginas: 1 sección = todo el documento
  if (numPages <= 10) {
    return [{
      name: `Documento PDF (${numPages} pág.)`,
      text,
      rowCount: numPages,
      preview,
      format: "pdf",
    }]
  }

  // Si >10 páginas: dividir en bloques de texto de ~5000 chars (aprox. 5 págs.)
  const CHUNK_SIZE = 5000
  const sections: ParsedSection[] = []
  let offset = 0
  let sectionIdx = 1

  while (offset < text.length) {
    // Intentar cortar en un párrafo natural
    let end = Math.min(offset + CHUNK_SIZE, text.length)
    if (end < text.length) {
      const lastBreak = text.lastIndexOf("\n\n", end)
      if (lastBreak > offset + CHUNK_SIZE * 0.5) end = lastBreak
    }
    const chunk = text.slice(offset, end).trim()
    if (chunk) {
      sections.push({
        name: `Sección ${sectionIdx} (págs. aprox. ${Math.ceil(offset / (text.length / numPages) + 1)})`,
        text: chunk,
        rowCount: 1,
        preview: chunk.slice(0, 300) + (chunk.length > 300 ? "..." : ""),
        format: "pdf",
      })
      sectionIdx++
    }
    offset = end
  }

  return sections
}

function parseCsv(text: string, fileName: string, shouldAnonymize: boolean): ParsedSection[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) {
    return [{
      name: fileName,
      headers: [],
      rows: [],
      rowCount: 0,
      preview: "(sin datos)",
      format: "csv",
    }]
  }

  // Parser CSV simple que maneja comillas
  function parseLine(line: string): string[] {
    const result: string[] = []
    let inQuotes = false
    let current = ""
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  let rows = lines.slice(1).map(line => {
    const values = parseLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
  })

  if (shouldAnonymize) {
    rows = rows.map(row => {
      const clean: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        clean[k] = anonymize(v)
      }
      return clean
    })
  }

  return [{
    name: fileName,
    headers,
    rows,
    rowCount: rows.length,
    preview: formatTablePreview(headers, rows),
    format: "csv",
  }]
}

// ── Configuración de formatos ─────────────────────────────────────

const MAX_SIZE: Record<string, number> = {
  xlsx: 5 * 1024 * 1024,
  xls:  5 * 1024 * 1024,
  pdf:  10 * 1024 * 1024,
  csv:  5 * 1024 * 1024,
}

// ── Handler ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const anonymizeParam = formData.get("anonymize") as string | null
  const sectionsToAnonymize = new Set(
    anonymizeParam ? JSON.parse(anonymizeParam) as number[] : []
  )

  if (!file) {
    return NextResponse.json({ error: "No se ha proporcionado archivo" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const maxSize = MAX_SIZE[ext]

  if (!maxSize) {
    return NextResponse.json(
      { error: "Formato no soportado. Use .xlsx, .xls, .pdf o .csv" },
      { status: 400 }
    )
  }

  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `El archivo no puede superar ${maxSize / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  try {
    if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer()
      const sections = parseExcel(buffer, sectionsToAnonymize)
      return NextResponse.json({ fileName: file.name, sections, format: "excel" })
    }

    if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer())
      const shouldAnonymize = sectionsToAnonymize.has(0)
      const sections = await parsePdf(buffer, shouldAnonymize)
      return NextResponse.json({ fileName: file.name, sections, format: "pdf" })
    }

    if (ext === "csv") {
      const text = await file.text()
      const shouldAnonymize = sectionsToAnonymize.has(0)
      const sections = parseCsv(text, file.name, shouldAnonymize)
      return NextResponse.json({ fileName: file.name, sections, format: "csv" })
    }

    return NextResponse.json({ error: "Formato no reconocido" }, { status: 400 })
  } catch (e) {
    console.error("[parse-file] Error:", e)
    return NextResponse.json({ error: "Error procesando el archivo" }, { status: 500 })
  }
}
