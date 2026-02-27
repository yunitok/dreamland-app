import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MAX_THREAD_IDS = 100
const MAX_EMAILS_PER_THREAD = 5

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let threadIds: string[]
  try {
    const body = await req.json()
    threadIds = body.threadIds
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(threadIds) || threadIds.length === 0) {
    return NextResponse.json(
      { error: "threadIds must be a non-empty array" },
      { status: 400 }
    )
  }

  if (threadIds.length > MAX_THREAD_IDS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_THREAD_IDS} threadIds per request` },
      { status: 400 }
    )
  }

  const validThreadIds = threadIds.filter(
    (id) => id && typeof id === "string"
  )

  if (validThreadIds.length === 0) {
    return NextResponse.json({ threads: {} })
  }

  const existingEmails = await prisma.emailInbox.findMany({
    where: { threadId: { in: validThreadIds } },
    select: {
      threadId: true,
      messageId: true,
      fromEmail: true,
      subject: true,
      aiSummary: true,
      aiPriority: true,
      actionRequired: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "asc" },
  })

  const threads: Record<string, typeof existingEmails> = {}
  for (const id of validThreadIds) {
    threads[id] = []
  }
  for (const email of existingEmails) {
    if (email.threadId) {
      threads[email.threadId]?.push(email)
    }
  }

  // Limitar a los últimos N emails por hilo
  for (const id of validThreadIds) {
    if (threads[id].length > MAX_EMAILS_PER_THREAD) {
      threads[id] = threads[id].slice(-MAX_EMAILS_PER_THREAD)
    }
  }

  return NextResponse.json({ threads })
}
