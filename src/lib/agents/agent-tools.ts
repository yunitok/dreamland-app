/**
 * Agent Tools — herramientas comunes disponibles para todos los agentes.
 *
 * Cada agente recibe estas tools además de sus tools específicos de dominio.
 * Diseño: descriptions claras y explícitas (el LLM solo ve schema + description).
 */

import { tool } from "ai"
import { z } from "zod"
import { createAgentMemory, queryAgentMemories } from "./agent-memory"
import { emitAgentEvent } from "./agent-events"
import { createNotificationsForPermission } from "@/lib/notification-service"

// ─── Schemas ─────────────────────────────────────────────────

const recordMemorySchema = z.object({
  type: z
    .enum(["insight", "decision", "pattern", "correction"])
    .describe("Tipo de memoria: insight=hallazgo, decision=decisión tomada, pattern=patrón detectado, correction=corrección del usuario"),
  content: z.string().describe("Contenido textual de la memoria. Sé específico y conciso."),
  ttlDays: z
    .number()
    .optional()
    .describe("Días de vida de la memoria. Omitir para permanente. Usar 30 para insights temporales, 90 para patrones."),
})

const queryMemoriesSchema = z.object({
  type: z
    .enum(["insight", "decision", "pattern", "correction"])
    .optional()
    .describe("Filtrar por tipo de memoria. Omitir para todos los tipos."),
  limit: z
    .number()
    .optional()
    .describe("Número máximo de memorias a recuperar (default: 10)"),
})

const emitEventSchema = z.object({
  eventType: z
    .string()
    .describe("Tipo de evento en formato 'dominio.accion'. Ej: 'cost.spike', 'email.processed', 'quality.degraded'"),
  payload: z
    .record(z.string(), z.unknown())
    .describe("Datos del evento. Incluye toda la información relevante para el agente receptor."),
  targetAgent: z
    .string()
    .optional()
    .describe("ID del agente destinatario. Omitir para broadcast a todos los agentes."),
})

const escalateSchema = z.object({
  reason: z
    .string()
    .describe("Razón detallada de la escalación. El humano leerá esto para entender el contexto."),
  priority: z
    .enum(["low", "medium", "high"])
    .describe("Prioridad: low=informativo, medium=requiere atención, high=urgente"),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Datos adicionales para el humano (métricas, IDs relevantes, etc.)"),
})

// ─── Tools ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = ReturnType<typeof tool<any, any>>

export function getCommonAgentTools(agentId: string): Record<string, AnyTool> {
  return {
    recordMemory: tool({
      description:
        "Guarda un insight, decisión o patrón en la memoria persistente del agente. " +
        "Usa esto para recordar información que será útil en futuras ejecuciones. " +
        "Ejemplo: 'El food cost del restaurante X subió 3pp por el aumento del precio del salmón'.",
      inputSchema: recordMemorySchema,
      execute: async (input: z.infer<typeof recordMemorySchema>) => {
        const id = await createAgentMemory({
          agentId,
          type: input.type,
          content: input.content,
          ttlDays: input.ttlDays,
        })
        return { success: true, memoryId: id, message: `Memoria guardada: ${input.type}` }
      },
    }),

    queryMemories: tool({
      description:
        "Consulta memorias anteriores del agente. Usa esto para recordar insights previos, " +
        "decisiones pasadas o patrones que hayas detectado en ejecuciones anteriores.",
      inputSchema: queryMemoriesSchema,
      execute: async (input: z.infer<typeof queryMemoriesSchema>) => {
        const memories = await queryAgentMemories(agentId, {
          type: input.type,
          limit: input.limit ?? 10,
        })
        return {
          count: memories.length,
          memories: memories.map((m) => ({
            type: m.type,
            content: m.content,
            relevance: m.relevance,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      },
    }),

    emitEvent: tool({
      description:
        "Emite un evento para notificar a otros agentes o al sistema. " +
        "Usa esto cuando descubras algo que otro agente debería saber. " +
        "Ejemplo: eventType='cost.spike' con datos del incremento detectado.",
      inputSchema: emitEventSchema,
      execute: async (input: z.infer<typeof emitEventSchema>) => {
        const eventId = await emitAgentEvent(
          input.eventType,
          input.payload as Record<string, unknown>,
          { sourceAgent: agentId, targetAgent: input.targetAgent },
        )
        return { success: true, eventId, message: `Evento emitido: ${input.eventType}` }
      },
    }),

    escalateToHuman: tool({
      description:
        "Escala la situación a un humano cuando no puedes resolver algo con confianza suficiente. " +
        "Esto crea una notificación para los administradores. Usa esto cuando: " +
        "- No estás seguro de qué acción tomar " +
        "- La situación requiere criterio humano " +
        "- Detectas algo anómalo que no puedes investigar más",
      inputSchema: escalateSchema,
      execute: async (input: z.infer<typeof escalateSchema>) => {
        await createNotificationsForPermission("admin", "manage", {
          type: "AGENT_ESCALATION",
          title: `[${input.priority.toUpperCase()}] Escalación de ${agentId}`,
          body: input.reason,
          href: "/admin/agents",
        })

        // También emitir evento para tracking
        await emitAgentEvent("agent.escalated", {
          agentId,
          reason: input.reason,
          priority: input.priority,
          ...((input.context as Record<string, unknown>) ?? {}),
        })

        return {
          success: true,
          message: "Escalación enviada. Un humano revisará la situación.",
        }
      },
    }),
  }
}
