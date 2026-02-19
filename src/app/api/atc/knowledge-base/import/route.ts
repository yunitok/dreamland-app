import { NextResponse } from "next/server"
import { bulkImportKnowledgeBaseEntries, BulkKBEntry } from "@/modules/atc/actions/knowledge-base"

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { entries } = await req.json() as { entries: BulkKBEntry[] }
  if (!Array.isArray(entries) || !entries.length) {
    return NextResponse.json({ error: "entries must be a non-empty array" }, { status: 400 })
  }

  try {
    const result = await bulkImportKnowledgeBaseEntries(entries)
    return NextResponse.json(result)
  } catch (e) {
    console.error("[import] Error:", e)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
