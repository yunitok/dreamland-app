/**
 * Agent Memory — CRUD de memorias persistentes para agentes.
 *
 * Tres capas:
 * - Working Memory: campo JSON en AgentRun.state (efímero, por ejecución)
 * - Episodic Memory: tabla AgentMemory (persistente, con decay temporal)
 * - Semantic Memory: namespace Pinecone por agente (futuro, Fase 2+)
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// ─── Tipos ─────────────────────────────────────────────────────

export type MemoryType = "insight" | "decision" | "pattern" | "correction"

export interface CreateMemoryInput {
  agentId: string
  type: MemoryType
  content: string
  metadata?: Record<string, unknown>
  /** Relevancia inicial (0-1, default 1.0) */
  relevance?: number
  /** TTL en días (null = permanente) */
  ttlDays?: number
}

// ─── Crear memoria ─────────────────────────────────────────────

export async function createAgentMemory(input: CreateMemoryInput): Promise<string> {
  const expiresAt = input.ttlDays
    ? new Date(Date.now() + input.ttlDays * 24 * 60 * 60 * 1000)
    : null

  const memory = await prisma.agentMemory.create({
    data: {
      agentId: input.agentId,
      type: input.type,
      content: input.content,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
      relevance: input.relevance ?? 1.0,
      expiresAt,
    },
  })

  return memory.id
}

// ─── Consultar memorias por agente ─────────────────────────────

export async function queryAgentMemories(
  agentId: string,
  options?: {
    type?: MemoryType
    limit?: number
    minRelevance?: number
  }
): Promise<Array<{ id: string; type: string; content: string; metadata: unknown; relevance: number; createdAt: Date }>> {
  const now = new Date()

  return prisma.agentMemory.findMany({
    where: {
      agentId,
      ...(options?.type && { type: options.type }),
      relevance: { gte: options?.minRelevance ?? 0.3 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: [
      { relevance: "desc" },
      { createdAt: "desc" },
    ],
    take: options?.limit ?? 20,
    select: {
      id: true,
      type: true,
      content: true,
      metadata: true,
      relevance: true,
      createdAt: true,
    },
  })
}

// ─── Decay temporal de relevancia ──────────────────────────────

/**
 * Reduce la relevancia de memorias antiguas.
 * Ejecutar periódicamente (ej: semanal) para que las memorias
 * viejas pierdan peso frente a las nuevas.
 */
export async function decayMemoryRelevance(
  agentId: string,
  decayFactor = 0.95
): Promise<number> {
  const memories = await prisma.agentMemory.findMany({
    where: { agentId, relevance: { gt: 0.1 } },
    select: { id: true, relevance: true },
  })

  let updated = 0
  for (const mem of memories) {
    const newRelevance = Math.max(0.1, mem.relevance * decayFactor)
    if (newRelevance !== mem.relevance) {
      await prisma.agentMemory.update({
        where: { id: mem.id },
        data: { relevance: newRelevance },
      })
      updated++
    }
  }

  return updated
}

// ─── Limpieza de memorias expiradas ────────────────────────────

export async function cleanupExpiredMemories(): Promise<number> {
  const { count } = await prisma.agentMemory.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
  return count
}
