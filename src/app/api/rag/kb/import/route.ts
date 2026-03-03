import { NextResponse } from "next/server"
import { bulkImportKBCore } from "@/modules/rag/actions/knowledge-base-core"
import type { BulkKBEntry } from "@/modules/rag/domain/types"
import { hasKBDomain } from "@/modules/rag/domain/domains"
import "@/modules/rag/domain/register-domains"

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { entries, domain = "atc" } = await req.json() as { entries: BulkKBEntry[]; domain?: string }

  if (!hasKBDomain(domain)) {
    return NextResponse.json({ error: `Dominio "${domain}" no registrado` }, { status: 400 })
  }

  if (!Array.isArray(entries) || !entries.length) {
    return NextResponse.json({ error: "entries must be a non-empty array" }, { status: 400 })
  }

  try {
    const result = await bulkImportKBCore(entries, true, [domain])
    return NextResponse.json(result)
  } catch (e) {
    console.error("[rag/import] Error:", e)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
