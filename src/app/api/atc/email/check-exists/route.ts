import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let messageId: string
  try {
    const body = await req.json()
    messageId = body.messageId
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 })
  }

  const existing = await prisma.emailInbox.findUnique({
    where: { messageId },
    select: { id: true },
  })

  return NextResponse.json({ exists: !!existing })
}
