/**
 * Tool: draftReply — Genera un borrador de respuesta usando el draft-generator existente.
 */

import { tool } from "ai"
import { z } from "zod"
import { generateEmailDraft } from "@/modules/atc/domain/draft-generator"

const draftReplySchema = z.object({
  emailInboxId: z.string().describe("ID del email para el que generar el borrador"),
})

export function createDraftReplyTool() {
  return tool({
    description:
      "Genera un borrador de respuesta para un email usando IA. " +
      "El borrador se guarda automáticamente y queda pendiente de revisión humana. " +
      "Solo usa esto para emails que requieren respuesta (actionRequired=true).",
    inputSchema: draftReplySchema,
    execute: async (input: z.infer<typeof draftReplySchema>) => {
      try {
        const result = await generateEmailDraft(input.emailInboxId)
        return {
          success: true,
          draftId: result.draftId,
          confidence: result.confidence,
          message: `Borrador generado con confianza ${result.confidence}`,
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        // Si ya existe un borrador, no es un error real
        if (msg.includes("Ya existe un borrador")) {
          return { success: true, alreadyExists: true, message: msg }
        }
        return { success: false, error: msg }
      }
    },
  })
}
