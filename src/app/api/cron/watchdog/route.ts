import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProcessRunStatus, AgentStatus } from "@prisma/client"

export const maxDuration = 30

const STALE_THRESHOLD_MS = 30 * 60 * 1000 // 30 min

const ACTIVE_AGENT_STATUSES: AgentStatus[] = [
  AgentStatus.QUEUED,
  AgentStatus.THINKING,
  AgentStatus.ACTING,
  AgentStatus.OBSERVING,
]

/**
 * Watchdog genérico: limpia ProcessRuns y AgentRuns atascados >30 min.
 * Corre cada 15 min via Vercel Cron.
 *
 * GET /api/cron/watchdog
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    let cleaned = 0

    // ── ProcessRuns atascados ──
    const staleRuns = await prisma.processRun.findMany({
      where: {
        status: ProcessRunStatus.RUNNING,
        startedAt: { lt: new Date(Date.now() - STALE_THRESHOLD_MS) },
      },
    })

    for (const run of staleRuns) {
      const minutes = Math.round((Date.now() - run.startedAt.getTime()) / 60000)
      const phases = (run.phases as unknown[] | null) ?? []

      await prisma.processRun.update({
        where: { id: run.id },
        data: {
          status: ProcessRunStatus.FAILED,
          finishedAt: new Date(),
          durationMs: Date.now() - run.startedAt.getTime(),
          error: `Watchdog: "${run.processSlug}" atascado ${minutes} min sin completar (${phases.length} fases completadas). Marcado como FAILED.`,
        },
      })

      console.log(`[watchdog] Limpiado ProcessRun ${run.id} (${run.processSlug}, ${minutes} min atascado)`)
      cleaned++
    }

    // ── AgentRuns atascados ──
    const staleAgentRuns = await prisma.agentRun.findMany({
      where: {
        status: { in: ACTIVE_AGENT_STATUSES },
        startedAt: { lt: new Date(Date.now() - STALE_THRESHOLD_MS) },
      },
    })

    for (const run of staleAgentRuns) {
      const minutes = Math.round((Date.now() - run.startedAt.getTime()) / 60000)

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: AgentStatus.FAILED,
          finishedAt: new Date(),
          durationMs: Date.now() - run.startedAt.getTime(),
          error: `Watchdog: agente "${run.agentId}" atascado ${minutes} min en estado ${run.status} (paso ${run.currentStep}/${run.maxSteps}). Marcado como FAILED.`,
        },
      })

      console.log(`[watchdog] Limpiado AgentRun ${run.id} (${run.agentId}, ${minutes} min atascado, paso ${run.currentStep})`)
      cleaned++
    }

    return NextResponse.json({
      success: true,
      cleaned,
      processRuns: staleRuns.length,
      agentRuns: staleAgentRuns.length,
      checked: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[watchdog] Error:", error)
    return NextResponse.json({ error: "Watchdog error" }, { status: 500 })
  }
}
