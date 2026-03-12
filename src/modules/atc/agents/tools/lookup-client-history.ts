/**
 * Tool: lookupClientHistory — Busca emails previos del mismo remitente.
 */

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const lookupClientHistorySchema = z.object({
  email: z.string().describe("Email del cliente a buscar"),
  limit: z.number().optional().describe("Máximo de emails a retornar (default: 10)"),
})

export function createLookupClientHistoryTool() {
  return tool({
    description:
      "Busca el historial de emails anteriores de un cliente por su dirección de email. " +
      "Útil para entender el contexto del cliente antes de responder.",
    inputSchema: lookupClientHistorySchema,
    execute: async (input: z.infer<typeof lookupClientHistorySchema>) => {
      const emails = await prisma.emailInbox.findMany({
        where: { fromEmail: input.email },
        orderBy: { receivedAt: "desc" },
        take: input.limit ?? 10,
        select: {
          id: true,
          subject: true,
          aiLabel: true,
          aiPriority: true,
          aiSummary: true,
          actionRequired: true,
          isRead: true,
          hasDraft: true,
          receivedAt: true,
          category: { select: { name: true } },
        },
      })

      const replies = await prisma.emailReply.findMany({
        where: {
          emailInbox: { fromEmail: input.email },
          isDraft: false,
          sentAt: { not: null },
        },
        orderBy: { sentAt: "desc" },
        take: 5,
        select: {
          subject: true,
          sentAt: true,
          bodyText: true,
        },
      })

      return {
        clientEmail: input.email,
        totalEmails: emails.length,
        emails: emails.map((e) => ({
          id: e.id,
          subject: e.subject,
          category: e.category?.name ?? e.aiLabel,
          priority: e.aiPriority,
          summary: e.aiSummary,
          actionRequired: e.actionRequired,
          responded: e.isRead,
          date: e.receivedAt.toISOString(),
        })),
        previousReplies: replies.map((r) => ({
          subject: r.subject,
          sentAt: r.sentAt?.toISOString(),
          preview: r.bodyText?.slice(0, 200),
        })),
        isReturningClient: emails.length > 1,
      }
    },
  })
}
