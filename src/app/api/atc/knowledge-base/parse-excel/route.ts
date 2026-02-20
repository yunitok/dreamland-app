import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export const runtime = "nodejs"

// ── Regex de anonimización genérica ──────────────────────────────
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

interface ParsedSheet {
  name: string
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
  preview: string
}

function formatPreview(headers: string[], rows: Record<string, string>[]): string {
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

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const anonymizeParam = formData.get("anonymize") as string | null
  const sheetsToAnonymize = new Set(
    anonymizeParam ? JSON.parse(anonymizeParam) as number[] : []
  )

  if (!file) {
    return NextResponse.json({ error: "No se ha proporcionado archivo" }, { status: 400 })
  }

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return NextResponse.json({ error: "Formato no soportado. Use .xlsx o .xls" }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 5MB" }, { status: 400 })
  }

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "buffer", cellText: true, cellDates: true })

    const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName, sheetIdx) => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
        defval: "",
        raw: false,
      })

      if (!jsonRows.length) {
        return { name: sheetName, headers: [], rows: [], rowCount: 0, preview: "(vacía)" }
      }

      const headers = Object.keys(jsonRows[0])

      // Filtrar filas completamente vacías
      let rows = jsonRows.filter(row =>
        Object.values(row).some(v => v?.toString().trim())
      )

      // Anonimizar si el usuario lo pidió para esta hoja
      if (sheetsToAnonymize.has(sheetIdx)) {
        rows = rows.map(row => {
          const clean: Record<string, string> = {}
          for (const [k, v] of Object.entries(row)) {
            clean[k] = typeof v === "string" ? anonymize(v) : String(v ?? "")
          }
          return clean
        })
      }

      const preview = formatPreview(headers, rows)

      return { name: sheetName, headers, rows, rowCount: rows.length, preview }
    })

    return NextResponse.json({ fileName: file.name, sheets })
  } catch (e) {
    console.error("[parse-excel] Error:", e)
    return NextResponse.json({ error: "Error procesando el archivo Excel" }, { status: 500 })
  }
}
