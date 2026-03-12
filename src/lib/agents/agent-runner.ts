/**
 * Agent Runner — wrapper de ejecución con tracking en DB.
 *
 * Análogo a withProcessTracking() de process-runner.ts,
 * pero adaptado al ciclo de vida de un agente (AgentRun).
 */

import { prisma } from "@/lib/prisma"
import { createNotificationsForPermission } from "@/lib/notification-service"
import { AgentStatus, ProcessTriggerType, Prisma } from "@prisma/client"
import type { AgentDefinition, AgentRunState, StepRecord } from "./types"

// ─── Crear un nuevo AgentRun ───────────────────────────────────

export async function createAgentRun(
  agentId: string,
  options: {
    triggerType?: ProcessTriggerType
    triggeredBy?: string
    maxSteps?: number
    initialState?: AgentRunState
    parentRunId?: string
  } = {}
): Promise<string> {
  const run = await prisma.agentRun.create({
    data: {
      agentId,
      status: AgentStatus.QUEUED,
      triggerType: options.triggerType ?? ProcessTriggerType.SYSTEM,
      triggeredBy: options.triggeredBy ?? null,
      maxSteps: options.maxSteps ?? 10,
      state: options.initialState
        ? JSON.parse(JSON.stringify(options.initialState)) as Prisma.InputJsonValue
        : Prisma.JsonNull,
      parentRunId: options.parentRunId ?? null,
    },
  })

  return run.id
}

// ─── Actualizar estado del run ─────────────────────────────────

export async function updateAgentRun(
  runId: string,
  data: {
    status?: AgentStatus
    currentStep?: number
    state?: unknown
    steps?: StepRecord[]
    totalTokens?: number
    totalCost?: number
    output?: Record<string, unknown>
    error?: string
    finishedAt?: Date
    durationMs?: number
  }
): Promise<void> {
  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.currentStep !== undefined && { currentStep: data.currentStep }),
      ...(data.state !== undefined && { state: data.state as Prisma.InputJsonValue }),
      ...(data.steps && { steps: data.steps as unknown as Prisma.InputJsonValue }),
      ...(data.totalTokens !== undefined && { totalTokens: data.totalTokens }),
      ...(data.totalCost !== undefined && { totalCost: data.totalCost }),
      ...(data.output && { output: data.output as Prisma.InputJsonValue }),
      ...(data.error && { error: data.error }),
      ...(data.finishedAt && { finishedAt: data.finishedAt }),
      ...(data.durationMs !== undefined && { durationMs: data.durationMs }),
    },
  })
}

// ─── Finalizar run ─────────────────────────────────────────────

export async function finalizeAgentRun(
  runId: string,
  status: AgentStatus,
  result: {
    output?: Record<string, unknown>
    error?: string
    steps: StepRecord[]
    totalTokens: number
    totalCost: number
  }
): Promise<void> {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { startedAt: true, agentId: true },
  })

  const durationMs = run ? Date.now() - run.startedAt.getTime() : 0

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      durationMs,
      output: result.output
        ? JSON.parse(JSON.stringify(result.output)) as Prisma.InputJsonValue
        : Prisma.JsonNull,
      error: result.error ?? null,
      steps: result.steps as unknown as Prisma.InputJsonValue,
      totalTokens: result.totalTokens,
      totalCost: result.totalCost,
    },
  })

  // Notificar si falló
  if (status === AgentStatus.FAILED && run) {
    await createNotificationsForPermission("admin", "manage", {
      type: "PROCESS_FAILED",
      title: `Agente fallido: ${run.agentId}`,
      body: result.error ?? "Error desconocido en agente autónomo",
      href: "/admin/agents",
    })
  }

  // Notificar si escaló
  if (status === AgentStatus.ESCALATED && run) {
    await createNotificationsForPermission("admin", "manage", {
      type: "AGENT_ESCALATION",
      title: `Agente escalado: ${run.agentId}`,
      body: result.error ?? "El agente requiere intervención humana",
      href: "/admin/agents",
    })
  }
}

// ─── Guard de cooldown ─────────────────────────────────────────

export async function checkAgentCooldown(
  definition: AgentDefinition
): Promise<{ canRun: boolean; lastRunAt?: Date }> {
  const lastRun = await prisma.agentRun.findFirst({
    where: {
      agentId: definition.id,
      status: { in: [AgentStatus.COMPLETED, AgentStatus.ESCALATED, AgentStatus.FAILED] },
    },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, finishedAt: true },
  })

  if (!lastRun?.finishedAt) return { canRun: true }

  const elapsed = Date.now() - lastRun.finishedAt.getTime()
  return {
    canRun: elapsed >= definition.cooldownMs,
    lastRunAt: lastRun.finishedAt,
  }
}

// ─── Guard de concurrencia ─────────────────────────────────────

export async function checkAgentNotRunning(agentId: string): Promise<boolean> {
  const running = await prisma.agentRun.findFirst({
    where: {
      agentId,
      status: { in: [AgentStatus.QUEUED, AgentStatus.THINKING, AgentStatus.ACTING, AgentStatus.OBSERVING] },
    },
    select: { id: true },
  })

  return !running
}

// ─── Obtener último run ────────────────────────────────────────

export async function getLastAgentRun(agentId: string) {
  return prisma.agentRun.findFirst({
    where: { agentId },
    orderBy: { startedAt: "desc" },
  })
}
