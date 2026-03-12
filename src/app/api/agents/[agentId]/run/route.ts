import { NextResponse } from "next/server"
import { ProcessTriggerType } from "@prisma/client"
import {
  getAgentDefinition,
  checkAgentCooldown,
  checkAgentNotRunning,
  runAgentLoop,
} from "@/lib/agents"
import "@/lib/agents/register-all"

export const maxDuration = 300

/**
 * Trigger manual o webhook de un agente.
 *
 * POST /api/agents/[agentId]/run
 * Headers: Authorization: Bearer <CRON_SECRET>
 * Body: { triggerData?: Record<string, unknown>, triggeredBy?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Buscar definición del agente
  const definition = getAgentDefinition(agentId)
  if (!definition) {
    return NextResponse.json(
      { error: `Agente '${agentId}' no registrado` },
      { status: 404 }
    )
  }

  // Guard: no ejecutar si ya hay uno corriendo
  const notRunning = await checkAgentNotRunning(agentId)
  if (!notRunning) {
    return NextResponse.json(
      { error: `Agente '${agentId}' ya está en ejecución` },
      { status: 409 }
    )
  }

  // Guard: cooldown
  const { canRun, lastRunAt } = await checkAgentCooldown(definition)
  if (!canRun) {
    return NextResponse.json(
      { error: `Agente '${agentId}' en cooldown`, lastRunAt },
      { status: 429 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))

    const result = await runAgentLoop(definition, {
      triggerType: ProcessTriggerType.MANUAL,
      triggeredBy: body.triggeredBy ?? "api",
      initialState: body.triggerData
        ? { context: {}, triggerData: body.triggerData }
        : undefined,
    })

    return NextResponse.json({
      success: true,
      runId: result.runId,
      status: result.status,
      steps: result.steps.length,
      totalTokens: result.totalTokens,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error(`[AGENT:${agentId}] Error en trigger manual:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    )
  }
}
