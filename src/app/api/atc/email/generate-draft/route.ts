import { NextResponse } from "next/server"
import { generateEmailDraft } from "@/modules/atc/domain/draft-generator"

export const maxDuration = 60

export async function POST(req: Request) {
  // Auth: n8n secret (internal/auto) or session-based (handled by draft-generator via prisma)
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let body: { emailInboxId: string; regenerate?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.emailInboxId) {
    return NextResponse.json({ error: "emailInboxId is required" }, { status: 400 })
  }

  try {
    // If regenerate, delete existing drafts first
    if (body.regenerate) {
      const { prisma } = await import("@/lib/prisma")
      await prisma.emailReply.deleteMany({
        where: { emailInboxId: body.emailInboxId, isDraft: true },
      })
      await prisma.emailInbox.update({
        where: { id: body.emailInboxId },
        data: { hasDraft: false },
      })
    }

    const result = await generateEmailDraft(body.emailInboxId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generating draft"
    // Don't fail loudly for "already exists" — it's expected for dedup
    if (message.includes("Ya existe")) {
      return NextResponse.json({ skipped: true, reason: message })
    }
    console.error("[generate-draft] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
