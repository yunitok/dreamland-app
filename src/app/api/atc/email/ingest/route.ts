import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotificationsForPermission } from "@/lib/notification-service"

interface EmailIngestPayload {
  messageId:          string
  threadId?:          string
  fromEmail:          string
  fromName?:          string
  subject:            string
  body:               string
  receivedAt?:        string
  category?:          string  // slug de EmailCategory
  aiLabel?:           string
  aiPriority?:        number
  aiConfidenceScore?: number
  aiSummary?:         string
  targetDate?:        string  // YYYY-MM-DD — fecha objetivo extraída del email
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let payload: EmailIngestPayload | EmailIngestPayload[]
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const emails = Array.isArray(payload) ? payload : [payload]

  if (!emails.length) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 })
  }

  const results = { created: 0, skipped: 0, errors: 0 }

  for (const email of emails) {
    if (!email.messageId || !email.fromEmail || !email.subject) {
      results.errors++
      continue
    }

    try {
      // Dedup por messageId
      const existing = await prisma.emailInbox.findUnique({
        where: { messageId: email.messageId },
        select: { id: true },
      })
      if (existing) {
        results.skipped++
        continue
      }

      // Resolver categoryId desde slug
      let categoryId: string | undefined
      if (email.category) {
        const cat = await prisma.emailCategory.findUnique({
          where: { slug: email.category },
          select: { id: true },
        })
        categoryId = cat?.id
      }

      const priority = email.aiPriority != null
        ? Math.min(Math.max(Math.round(email.aiPriority), 1), 5)
        : undefined

      await prisma.emailInbox.create({
        data: {
          messageId:         email.messageId,
          threadId:          email.threadId,
          fromEmail:         email.fromEmail,
          fromName:          email.fromName,
          subject:           email.subject,
          body:              email.body,
          aiLabel:           email.aiLabel,
          aiPriority:        priority,
          aiConfidenceScore: email.aiConfidenceScore,
          aiSummary:         email.aiSummary,
          targetDate:        email.targetDate ? new Date(email.targetDate) : undefined,
          categoryId,
          receivedAt:        email.receivedAt ? new Date(email.receivedAt) : new Date(),
        },
      })
      results.created++

      // Notificar a todos los agentes ATC si el email es de alta prioridad (P4 o P5)
      if (priority && priority >= 4) {
        const urgencyLabel = priority === 5 ? "URGENTE" : "Alta prioridad"
        await createNotificationsForPermission("atc", "manage", {
          type: "EMAIL_HIGH_PRIORITY",
          title: `Email ${urgencyLabel}: ${email.subject}`,
          body: `De: ${email.fromName || email.fromEmail}${email.aiSummary ? ` — ${email.aiSummary}` : ""}`,
          href: "/atc/backoffice",
          metadata: { emailMessageId: email.messageId, aiPriority: priority },
        })
      }
    } catch (e) {
      console.error("[email/ingest] Error processing email:", email.messageId, e)
      results.errors++
    }
  }

  return NextResponse.json(results)
}
