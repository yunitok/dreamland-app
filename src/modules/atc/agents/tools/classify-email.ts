/**
 * Tool: classifyEmail — Clasificación IA de emails entrantes.
 *
 * Reemplaza la clasificación de n8n con un tool ejecutable por el ATC Agent.
 */

import { tool } from "ai"
import { z } from "zod"
import { generateObject } from "ai"
import { getChatLanguageModel } from "@/lib/ai/config"
import { prisma } from "@/lib/prisma"

const classifyEmailSchema = z.object({
  emailInboxId: z.string().describe("ID del email a clasificar (EmailInbox.id)"),
})

const classificationSchema = z.object({
  category: z.string().describe("Slug de categoría: reservas, quejas, info, proveedores, otros"),
  priority: z.number().min(1).max(5).describe("Prioridad 1-5 (5=urgente)"),
  actionRequired: z.boolean().describe("¿Requiere respuesta o acción?"),
  summary: z.string().describe("Resumen conciso del email en 1-2 frases"),
  confidence: z.number().min(0).max(1).describe("Confianza de la clasificación 0-1"),
  suggestedAction: z.string().describe("Acción sugerida: responder, escalar, archivar, investigar"),
})

export function createClassifyEmailTool() {
  return tool({
    description:
      "Clasifica un email entrante por categoría, prioridad y acción requerida. " +
      "Usa esto para determinar cómo procesar cada email.",
    inputSchema: classifyEmailSchema,
    execute: async (input: z.infer<typeof classifyEmailSchema>) => {
      const email = await prisma.emailInbox.findUnique({
        where: { id: input.emailInboxId },
        select: {
          id: true,
          fromEmail: true,
          fromName: true,
          subject: true,
          body: true,
          category: { select: { name: true, slug: true } },
        },
      })

      if (!email) {
        return { error: `Email ${input.emailInboxId} no encontrado` }
      }

      // Truncar body para eficiencia de tokens
      const bodyTruncated = email.body.length > 2000
        ? email.body.slice(0, 2000) + "..."
        : email.body

      const { object: classification } = await generateObject({
        model: getChatLanguageModel(),
        schema: classificationSchema,
        system:
          "Eres un clasificador de emails para un grupo de restaurantes (Voltereta). " +
          "Clasifica el email por categoría, prioridad y acción requerida. " +
          "Categorías posibles: reservas, quejas, info, proveedores, eventos, rrhh, otros. " +
          "Prioridad: 1=bajo, 2=normal, 3=medio, 4=alto, 5=urgente. " +
          "Las quejas y cancelaciones son siempre prioridad >= 4.",
        prompt: `De: ${email.fromName ?? email.fromEmail} <${email.fromEmail}>\nAsunto: ${email.subject}\n\n${bodyTruncated}`,
        maxOutputTokens: 300,
        temperature: 0.1,
      })

      // Actualizar email con clasificación IA
      const category = await prisma.emailCategory.findFirst({
        where: { slug: classification.category },
        select: { id: true },
      })

      await prisma.emailInbox.update({
        where: { id: input.emailInboxId },
        data: {
          aiLabel: classification.category,
          aiPriority: classification.priority,
          aiConfidenceScore: classification.confidence,
          aiSummary: classification.summary,
          actionRequired: classification.actionRequired,
          ...(category && { categoryId: category.id }),
        },
      })

      return {
        emailId: input.emailInboxId,
        ...classification,
        categoryUpdated: !!category,
      }
    },
  })
}
