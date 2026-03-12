/**
 * Supervisor Determinista — coordinación de agentes por reglas.
 *
 * No usa LLM. Gestiona:
 * - Orden de ejecución cuando hay múltiples eventos
 * - Budget global de tokens (diario)
 * - Resumen agregado de insights de todos los agentes
 */

import { prisma } from "@/lib/prisma"
import { AgentStatus } from "@prisma/client"
import { getAllAgentDefinitions } from "./agent-registry"

// ─── Budget diario ──────────────────────────────────────────

const DAILY_TOKEN_BUDGET = 100_000 // ~$3/mes con gpt-4o-mini

export async function checkDailyBudget(): Promise<{
  used: number
  budget: number
  remaining: number
  canRun: boolean
}> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const result = await prisma.agentRun.aggregate({
    where: {
      startedAt: { gte: todayStart },
      status: { in: [AgentStatus.COMPLETED, AgentStatus.ESCALATED, AgentStatus.FAILED] },
    },
    _sum: { totalTokens: true },
  })

  const used = result._sum.totalTokens ?? 0
  return {
    used,
    budget: DAILY_TOKEN_BUDGET,
    remaining: DAILY_TOKEN_BUDGET - used,
    canRun: used < DAILY_TOKEN_BUDGET,
  }
}

// ─── Resumen diario de agentes ──────────────────────────────

export interface AgentDailySummary {
  agentId: string
  agentName: string
  runsToday: number
  completedToday: number
  failedToday: number
  escalatedToday: number
  tokensToday: number
  costToday: number
  lastRunAt: Date | null
  lastStatus: AgentStatus | null
}

export async function getDailyAgentSummary(): Promise<AgentDailySummary[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const agents = getAllAgentDefinitions()

  const runs = await prisma.agentRun.findMany({
    where: { startedAt: { gte: todayStart } },
    select: {
      agentId: true,
      status: true,
      totalTokens: true,
      totalCost: true,
      startedAt: true,
    },
    orderBy: { startedAt: "desc" },
  })

  return agents.map((agent) => {
    const agentRuns = runs.filter((r) => r.agentId === agent.id)
    const lastRun = agentRuns[0] ?? null

    return {
      agentId: agent.id,
      agentName: agent.name,
      runsToday: agentRuns.length,
      completedToday: agentRuns.filter((r) => r.status === AgentStatus.COMPLETED).length,
      failedToday: agentRuns.filter((r) => r.status === AgentStatus.FAILED).length,
      escalatedToday: agentRuns.filter((r) => r.status === AgentStatus.ESCALATED).length,
      tokensToday: agentRuns.reduce((s, r) => s + r.totalTokens, 0),
      costToday: agentRuns.reduce((s, r) => s + r.totalCost, 0),
      lastRunAt: lastRun?.startedAt ?? null,
      lastStatus: lastRun?.status ?? null,
    }
  })
}

// ─── Insights recientes de todos los agentes ────────────────

export async function getRecentInsights(limit = 20) {
  return prisma.agentMemory.findMany({
    where: { type: "insight" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      agentId: true,
      content: true,
      relevance: true,
      createdAt: true,
    },
  })
}

// ─── Cola de eventos pendientes ─────────────────────────────

export async function getPendingEventsCount(): Promise<number> {
  return prisma.agentEvent.count({ where: { processed: false } })
}

export async function getRecentEvents(limit = 20) {
  return prisma.agentEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      eventType: true,
      sourceAgent: true,
      targetAgent: true,
      processed: true,
      createdAt: true,
    },
  })
}
