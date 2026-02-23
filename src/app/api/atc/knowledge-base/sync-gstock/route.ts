import { NextResponse } from "next/server"
import { syncKnowledgeBaseBySource } from "@/modules/atc/actions/knowledge-base"
import type { BulkKBEntry } from "@/modules/atc/actions/knowledge-base-core"

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { entries } = await req.json() as { entries: BulkKBEntry[] }
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries must be an array" }, { status: 400 })
  }

  try {
    const result = await syncKnowledgeBaseBySource("gstock", entries)
    return NextResponse.json(result)
  } catch (e) {
    console.error("[sync-gstock] Error:", e)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
