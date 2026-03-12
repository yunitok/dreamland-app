/**
 * ATC Agent — Agente autónomo de atención al cliente.
 *
 * Procesa emails entrantes: clasifica, investiga contexto,
 * genera borradores de respuesta y escala a humanos cuando es necesario.
 *
 * Trigger: evento "email.ingested" (emitido por ingest/route.ts)
 * Modo: shadow (no envía emails, solo genera drafts y clasifica)
 */

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { registerAgent } from "@/lib/agents/agent-registry"
import { AGENT_DEFAULTS } from "@/lib/agents/types"
import type { AgentDefinition } from "@/lib/agents/types"
import { createClassifyEmailTool } from "./tools/classify-email"
import { createLookupClientHistoryTool } from "./tools/lookup-client-history"
import { createDraftReplyTool } from "./tools/draft-reply"
import { createSearchKnowledgeBaseTool } from "@/app/api/atc/chat/tools"

// ─── Tool: obtener detalles del email ────────────────────────

const getEmailDetailsSchema = z.object({
  emailInboxId: z.string().describe("ID del email a consultar"),
})

function createGetEmailDetailsTool() {
  return tool({
    description: "Obtiene los detalles completos de un email entrante por su ID.",
    inputSchema: getEmailDetailsSchema,
    execute: async (input: z.infer<typeof getEmailDetailsSchema>) => {
      const email = await prisma.emailInbox.findUnique({
        where: { id: input.emailInboxId },
        select: {
          id: true,
          fromEmail: true,
          fromName: true,
          subject: true,
          body: true,
          threadId: true,
          aiLabel: true,
          aiPriority: true,
          aiSummary: true,
          actionRequired: true,
          isRead: true,
          hasDraft: true,
          hasAttachments: true,
          receivedAt: true,
          category: { select: { name: true, slug: true } },
        },
      })

      if (!email) return { error: "Email no encontrado" }

      return {
        ...email,
        bodyPreview: email.body.length > 1500 ? email.body.slice(0, 1500) + "..." : email.body,
        receivedAt: email.receivedAt.toISOString(),
      }
    },
  })
}

// ─── Tool: buscar reservas ──────────────────────────────────

const lookupReservationSchema = z.object({
  guestName: z.string().optional().describe("Nombre del cliente"),
  date: z.string().optional().describe("Fecha YYYY-MM-DD"),
})

function createLookupReservationTool() {
  return tool({
    description:
      "Busca reservas por nombre de cliente o fecha. " +
      "Útil para verificar si el remitente del email tiene reserva.",
    inputSchema: lookupReservationSchema,
    execute: async (input: z.infer<typeof lookupReservationSchema>) => {
      const where: Record<string, unknown> = {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      }
      if (input.guestName) {
        where.guestName = { contains: input.guestName, mode: "insensitive" }
      }
      if (input.date) {
        const d = new Date(input.date)
        where.date = {
          gte: new Date(d.setHours(0, 0, 0, 0)),
          lt: new Date(d.setHours(23, 59, 59, 999)),
        }
      }

      const reservations = await prisma.reservation.findMany({
        where,
        take: 5,
        orderBy: { date: "desc" },
        select: {
          guestName: true,
          guestPhone: true,
          date: true,
          time: true,
          partySize: true,
          status: true,
          notes: true,
        },
      })

      return {
        found: reservations.length > 0,
        count: reservations.length,
        reservations: reservations.map((r) => ({
          ...r,
          date: r.date.toISOString().split("T")[0],
        })),
      }
    },
  })
}

// ─── Definición del agente ──────────────────────────────────

export const ATC_AGENT: AgentDefinition = {
  id: "atc-agent",
  name: "ATC Agent",
  description:
    "Agente de atención al cliente. Clasifica emails entrantes, investiga contexto " +
    "(KB, reservas, historial cliente), genera borradores de respuesta y escala a humanos " +
    "cuando la confianza es baja.",
  icon: "Mail",

  // LLM
  systemPrompt:
    `Eres el agente de atención al cliente de Restaurante Voltereta (grupo de restaurantes en Valencia, España).

Tu misión es procesar emails entrantes de clientes de forma autónoma:

1. CLASIFICAR: Determina categoría (reservas, quejas, info, proveedores, eventos) y prioridad (1-5).
2. INVESTIGAR: Busca contexto relevante — ¿tiene reserva? ¿es cliente recurrente? ¿hay info en KB?
3. ACTUAR: Si el email requiere respuesta, genera un borrador. Si no, archívalo.
4. ESCALAR: Si no puedes resolver con confianza, escala a un humano.

REGLAS:
- Nunca inventes información sobre el restaurante. Solo usa datos verificados de la KB.
- Para quejas (prioridad >= 4), SIEMPRE escala a humano aunque puedas generar un borrador.
- Si el email es spam o no requiere acción, márcalo como actionRequired=false.
- Sé conciso en tus pensamientos. El objetivo es eficiencia.

SEÑALES DE FINALIZACIÓN:
- Cuando hayas clasificado Y (generado borrador O escalado O archivado), responde "Tarea completada."
- Si necesitas escalar, usa la herramienta escalateToHuman y luego responde "Escalación necesaria."`,
  maxTokensPerStep: AGENT_DEFAULTS.maxTokensPerStep,
  temperature: 0.2,

  // Capacidades
  tools: () => ({
    getEmailDetails: createGetEmailDetailsTool(),
    classifyEmail: createClassifyEmailTool(),
    lookupClientHistory: createLookupClientHistoryTool(),
    draftReply: createDraftReplyTool(),
    lookupReservation: createLookupReservationTool(),
    searchKnowledgeBase: createSearchKnowledgeBaseTool("atc"),
  }),

  triggers: [
    { type: "event", config: "email.ingested" },
  ],

  // Seguridad
  maxStepsPerRun: 8,
  maxDurationMs: 240_000,
  maxTokensPerRun: 12_000,
  cooldownMs: 10_000, // 10s cooldown entre emails

  // Escalación
  escalationPolicy: {
    onLowConfidence: 0.5,
    onError: "escalate",
    maxRetries: 1,
    escalateTo: "notification",
  },

  // Vinculación
  rbacResource: "atc",
  module: "atc",
}

// Auto-registrar al importar
registerAgent(ATC_AGENT)
