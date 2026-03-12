"use server"

import { requirePermission } from "@/lib/actions/rbac"
import { prisma } from "@/lib/prisma"
import { AgentStatus } from "@prisma/client"
import { getAllAgentDefinitions } from "@/lib/agents/agent-registry"
import "@/lib/agents/register-all"
import {
  getDailyAgentSummary,
  checkDailyBudget,
  getRecentInsights,
  getPendingEventsCount,
  getRecentEvents,
} from "@/lib/agents/orchestrator"

// ─── Dashboard principal ────────────────────────────────────

export interface AgentDashboardData {
  agents: Array<{
    id: string
    name: string
    description: string
    module: string
    triggers: Array<{ type: string; config?: string }>
    maxStepsPerRun: number
    cooldownMs: number
    // Stats de hoy
    runsToday: number
    completedToday: number
    failedToday: number
    escalatedToday: number
    tokensToday: number
    costToday: number
    lastRunAt: string | null
    lastStatus: AgentStatus | null
  }>
  budget: {
    used: number
    budget: number
    remaining: number
    percentUsed: number
  }
  pendingEvents: number
  recentInsights: Array<{
    id: string
    agentId: string
    content: string
    relevance: number
    createdAt: string
  }>
  recentEvents: Array<{
    id: string
    eventType: string
    sourceAgent: string | null
    targetAgent: string | null
    processed: boolean
    createdAt: string
  }>
}

export async function getAgentDashboard(): Promise<AgentDashboardData> {
  await requirePermission("admin", "manage")

  const [dailySummary, budget, insights, pendingEvents, events] = await Promise.all([
    getDailyAgentSummary(),
    checkDailyBudget(),
    getRecentInsights(10),
    getPendingEventsCount(),
    getRecentEvents(15),
  ])

  const definitions = getAllAgentDefinitions()

  return {
    agents: definitions.map((def) => {
      const summary = dailySummary.find((s) => s.agentId === def.id)
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        module: def.module,
        triggers: def.triggers,
        maxStepsPerRun: def.maxStepsPerRun,
        cooldownMs: def.cooldownMs,
        runsToday: summary?.runsToday ?? 0,
        completedToday: summary?.completedToday ?? 0,
        failedToday: summary?.failedToday ?? 0,
        escalatedToday: summary?.escalatedToday ?? 0,
        tokensToday: summary?.tokensToday ?? 0,
        costToday: summary?.costToday ?? 0,
        lastRunAt: summary?.lastRunAt?.toISOString() ?? null,
        lastStatus: summary?.lastStatus ?? null,
      }
    }),
    budget: {
      ...budget,
      percentUsed: Math.round((budget.used / budget.budget) * 100),
    },
    pendingEvents,
    recentInsights: insights.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    recentEvents: events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

// ─── Historial de runs ──────────────────────────────────────

export interface AgentRunHistoryItem {
  id: string
  agentId: string
  status: AgentStatus
  currentStep: number
  maxSteps: number
  totalTokens: number
  totalCost: number
  durationMs: number | null
  error: string | null
  startedAt: string
  finishedAt: string | null
}

export async function getAgentRunHistory(
  agentId?: string,
  limit = 20
): Promise<AgentRunHistoryItem[]> {
  await requirePermission("admin", "manage")

  const runs = await prisma.agentRun.findMany({
    where: agentId ? { agentId } : undefined,
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      agentId: true,
      status: true,
      currentStep: true,
      maxSteps: true,
      totalTokens: true,
      totalCost: true,
      durationMs: true,
      error: true,
      startedAt: true,
      finishedAt: true,
    },
  })

  return runs.map((r) => ({
    ...r,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  }))
}

// ─── Detalle de un run ──────────────────────────────────────

export async function getAgentRunDetail(runId: string) {
  await requirePermission("admin", "manage")

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
  })

  if (!run) return null

  return {
    ...run,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  }
}
