import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let messageIds: string[]
  try {
    const body = await req.json()
    messageIds = body.messageIds
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json(
      { error: "messageIds must be a non-empty array" },
      { status: 400 }
    )
  }

  if (messageIds.length > 200) {
    return NextResponse.json(
      { error: "Maximum 200 messageIds per request" },
      { status: 400 }
    )
  }

  const existingRecords = await prisma.emailInbox.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true },
  })

  return NextResponse.json({
    existing: existingRecords.map((r) => r.messageId),
  })
}
