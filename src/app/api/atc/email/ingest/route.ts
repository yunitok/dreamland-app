import { NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotificationsForPermission } from "@/lib/notification-service"
import { generateEmailDraft } from "@/modules/atc/domain/draft-generator"
import { emitAgentEvent } from "@/lib/agents/agent-events"

export const maxDuration = 300

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
  actionRequired?:    boolean // false si es follow-up/cierre de hilo ya gestionado
  hasAttachments?:    boolean // true si el email original tiene adjuntos
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

      // Resolver categoryId desde slug (incluir notifyRoles y name para cross-departamento)
      let categoryId: string | undefined
      let categoryNotifyRoles: string[] = []
      let categoryName: string | undefined
      if (email.category) {
        const cat = await prisma.emailCategory.findUnique({
          where: { slug: email.category },
          select: { id: true, notifyRoles: true, name: true },
        })
        categoryId = cat?.id
        categoryNotifyRoles = cat?.notifyRoles ?? []
        categoryName = cat?.name
      }

      const priority = email.aiPriority != null
        ? Math.min(Math.max(Math.round(email.aiPriority), 1), 5)
        : undefined

      // Detectar clasificaciones potencialmente fallidas
      if (email.aiConfidenceScore === 0 || email.aiConfidenceScore == null) {
        console.warn(
          "[email/ingest] Low/null confidence:",
          email.messageId,
          "| label:", email.aiLabel,
          "| category:", email.category
        )
      }

      const created = await prisma.emailInbox.create({
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
          actionRequired:    email.actionRequired ?? true,
          hasAttachments:    email.hasAttachments ?? false,
          categoryId,
          receivedAt:        email.receivedAt ? new Date(email.receivedAt) : new Date(),
        },
        select: { id: true },
      })
      results.created++

      // Notificar a todos los agentes ATC si el email es de alta prioridad (P4 o P5) y requiere acción
      if (priority && priority >= 4 && email.actionRequired !== false) {
        const urgencyLabel = priority === 5 ? "URGENTE" : "Alta prioridad"
        await createNotificationsForPermission("atc", "manage", {
          type: "EMAIL_HIGH_PRIORITY",
          title: `Email ${urgencyLabel}: ${email.subject}`,
          body: `De: ${email.fromName || email.fromEmail}${email.aiSummary ? ` — ${email.aiSummary}` : ""}`,
          href: "/atc/backoffice",
          metadata: { emailMessageId: email.messageId, aiPriority: priority },
        })
      }

      // Notificar a roles de otros departamentos si la categoría lo requiere
      if (categoryNotifyRoles.length > 0) {
        try {
          const usersToNotify = await prisma.user.findMany({
            where: { role: { code: { in: categoryNotifyRoles } } },
            select: { id: true },
          })
          if (usersToNotify.length > 0) {
            await prisma.notification.createMany({
              data: usersToNotify.map(u => ({
                userId: u.id,
                type: "EMAIL_CROSS_DEPARTMENT" as const,
                title: `Email de ${categoryName ?? "ATC"}: ${email.subject}`,
                body: email.aiSummary || `De: ${email.fromName || email.fromEmail}`,
                href: `/shared/email/${created.id}`,
                metadata: { emailId: created.id, category: categoryName },
              })),
              skipDuplicates: true,
            })
          }
        } catch (notifError) {
          console.error("[email/ingest] Error sending cross-department notifications:", notifError)
        }
      }
      // Emitir evento para el ecosistema agéntico
      after(async () => {
        try {
          await emitAgentEvent("email.ingested", {
            emailInboxId: created.id,
            fromEmail: email.fromEmail,
            subject: email.subject,
            category: email.category ?? null,
            priority: priority ?? null,
            actionRequired: email.actionRequired ?? true,
          }, { targetAgent: "atc-agent" })
        } catch (err) {
          console.error("[email/ingest] Error emitting agent event:", err)
        }
      })

      // Auto-generate AI draft for emails that require action
      if (email.actionRequired !== false) {
        const emailInboxId = created.id
        after(async () => {
          try {
            const result = await generateEmailDraft(emailInboxId)
            console.log("[email/ingest] Draft generated:", emailInboxId, result)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            if (message.includes("Ya existe")) {
              console.log("[email/ingest] Draft skipped (dedup):", emailInboxId)
            } else {
              console.error("[email/ingest] Draft generation failed:", emailInboxId, message)
            }
          }
        })
      }
    } catch (e) {
      console.error("[email/ingest] Error processing email:", email.messageId, e)
      results.errors++
    }
  }

  return NextResponse.json(results)
}
