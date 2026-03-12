/**
 * Agent Events — event bus ligero basado en PostgreSQL.
 *
 * Los agentes emiten eventos tras completar acciones.
 * El cron tick lee eventos pendientes y despacha al agente destino.
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// ─── Emitir evento ─────────────────────────────────────────────

export async function emitAgentEvent(
  eventType: string,
  payload: Record<string, unknown>,
  options?: {
    sourceAgent?: string
    targetAgent?: string
  }
): Promise<string> {
  const event = await prisma.agentEvent.create({
    data: {
      eventType,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      sourceAgent: options?.sourceAgent ?? null,
      targetAgent: options?.targetAgent ?? null,
    },
  })
  return event.id
}

// ─── Consumir eventos pendientes ───────────────────────────────

export async function consumePendingEvents(
  targetAgent: string,
  limit = 10
): Promise<Array<{ id: string; eventType: string; payload: unknown; sourceAgent: string | null; createdAt: Date }>> {
  const events = await prisma.agentEvent.findMany({
    where: {
      processed: false,
      OR: [
        { targetAgent },
        { targetAgent: null },  // broadcast
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      eventType: true,
      payload: true,
      sourceAgent: true,
      createdAt: true,
    },
  })

  return events
}

// ─── Marcar eventos como procesados ────────────────────────────

export async function markEventsProcessed(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return

  await prisma.agentEvent.updateMany({
    where: { id: { in: eventIds } },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  })
}

// ─── Consultar eventos por tipo ────────────────────────────────

export async function getUnprocessedEventsByType(
  eventType: string,
  limit = 10
): Promise<Array<{ id: string; payload: unknown; sourceAgent: string | null; createdAt: Date }>> {
  return prisma.agentEvent.findMany({
    where: {
      eventType,
      processed: false,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      payload: true,
      sourceAgent: true,
      createdAt: true,
    },
  })
}

// ─── Limpieza de eventos procesados antiguos ───────────────────

export async function cleanupOldEvents(daysOld = 30): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysOld)

  const { count } = await prisma.agentEvent.deleteMany({
    where: {
      processed: true,
      processedAt: { lt: cutoff },
    },
  })

  return count
}
