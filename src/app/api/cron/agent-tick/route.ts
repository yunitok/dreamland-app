import { NextResponse } from "next/server"
import { ProcessTriggerType } from "@prisma/client"
import {
  getAllAgentDefinitions,
  getAgentsForEventType,
  consumePendingEvents,
  markEventsProcessed,
  checkAgentCooldown,
  checkAgentNotRunning,
  runAgentLoop,
} from "@/lib/agents"
import "@/lib/agents/register-all"

export const maxDuration = 300

/**
 * Agent Tick — cron cada 5 minutos.
 *
 * 1. Lee eventos pendientes en agent_events
 * 2. Despacha a los agentes suscritos a cada tipo de evento
 * 3. Ejecuta agentes con trigger tipo "cron" si toca
 *
 * GET /api/cron/agent-tick
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const results: Array<{
    agentId: string
    trigger: string
    status: string
    durationMs?: number
    error?: string
  }> = []

  try {
    const allAgents = getAllAgentDefinitions()

    // ── Fase 1: Procesar eventos pendientes ──

    const processedEventIds: string[] = []

    for (const agent of allAgents) {
      const eventTriggers = agent.triggers.filter((t) => t.type === "event")
      if (eventTriggers.length === 0) continue

      for (const trigger of eventTriggers) {
        // Buscar agentes suscritos a este tipo de evento
        const events = await consumePendingEvents(agent.id, 5)
        const matching = events.filter((e) => e.eventType === trigger.config)

        if (matching.length === 0) continue

        // Verificar que el agente puede ejecutarse
        const notRunning = await checkAgentNotRunning(agent.id)
        if (!notRunning) {
          results.push({ agentId: agent.id, trigger: `event:${trigger.config}`, status: "skipped:running" })
          continue
        }

        const { canRun } = await checkAgentCooldown(agent)
        if (!canRun) {
          results.push({ agentId: agent.id, trigger: `event:${trigger.config}`, status: "skipped:cooldown" })
          continue
        }

        // Ejecutar agente con los datos del primer evento como trigger
        const firstEvent = matching[0]
        try {
          const result = await runAgentLoop(agent, {
            triggerType: ProcessTriggerType.SYSTEM,
            triggeredBy: `event:${trigger.config}`,
            initialState: {
              context: {},
              triggerData: {
                eventType: firstEvent.eventType,
                payload: firstEvent.payload,
                eventCount: matching.length,
              },
            },
          })

          results.push({
            agentId: agent.id,
            trigger: `event:${trigger.config}`,
            status: result.status,
            durationMs: result.durationMs,
          })
        } catch (error) {
          results.push({
            agentId: agent.id,
            trigger: `event:${trigger.config}`,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          })
        }

        // Marcar eventos como procesados
        processedEventIds.push(...matching.map((e) => e.id))
      }
    }

    if (processedEventIds.length > 0) {
      await markEventsProcessed(processedEventIds)
    }

    // ── Fase 2: Cron triggers (los agentes que deben correr por horario) ──
    // Los cron triggers de agentes se manejan via Vercel Cron dedicado
    // (ej: /api/cron/atc-agent-tick). El agent-tick solo procesa eventos.

    return NextResponse.json({
      success: true,
      agentsChecked: allAgents.length,
      eventsProcessed: processedEventIds.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[agent-tick] Error:", error)
    return NextResponse.json(
      { error: "Agent tick error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
