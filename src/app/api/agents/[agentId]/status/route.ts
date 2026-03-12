import { NextResponse } from "next/server"
import { getAgentDefinition, getLastAgentRun } from "@/lib/agents"
import "@/lib/agents/register-all"

/**
 * Estado del último run de un agente.
 *
 * GET /api/agents/[agentId]/status
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const definition = getAgentDefinition(agentId)
  if (!definition) {
    return NextResponse.json(
      { error: `Agente '${agentId}' no registrado` },
      { status: 404 }
    )
  }

  const lastRun = await getLastAgentRun(agentId)

  return NextResponse.json({
    agentId,
    name: definition.name,
    module: definition.module,
    lastRun: lastRun
      ? {
          id: lastRun.id,
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          finishedAt: lastRun.finishedAt,
          durationMs: lastRun.durationMs,
          totalTokens: lastRun.totalTokens,
          currentStep: lastRun.currentStep,
          error: lastRun.error,
        }
      : null,
  })
}
