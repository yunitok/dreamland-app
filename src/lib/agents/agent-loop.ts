/**
 * Agent Loop — core Think→Act→Observe usando Vercel AI SDK v6.
 *
 * Cada paso del loop es una llamada a generateText() con tools.
 * El AI SDK maneja internamente el tool calling (stopWhen: stepCountIs(3)).
 * El loop externo itera hasta que el agente decide que ha terminado,
 * excede el budget de tokens/tiempo, o necesita escalar.
 */

import { generateText, stepCountIs } from "ai"
import { AgentStatus, Prisma } from "@prisma/client"
import { getChatLanguageModel } from "@/lib/ai/config"
import { createAgentRun, updateAgentRun, finalizeAgentRun } from "./agent-runner"
import { getCommonAgentTools } from "./agent-tools"
import type {
  AgentDefinition,
  AgentRunState,
  StepRecord,
  StepObservation,
  ToolCallRecord,
  AgentExecutionResult,
  ProcessTriggerType,
} from "./types"

// ─── Estimación de coste por modelo ────────────────────────────

const COST_PER_1K_TOKENS: Record<string, number> = {
  "openai/gpt-4o-mini": 0.00015,
  "openai/gpt-4o": 0.005,
  default: 0.0003,
}

function estimateCost(tokens: number, model?: string): number {
  const rate = COST_PER_1K_TOKENS[model ?? "default"] ?? COST_PER_1K_TOKENS.default
  return (tokens / 1000) * rate
}

// ─── Construir mensajes del agente ─────────────────────────────

function buildAgentMessages(
  state: AgentRunState,
  previousSteps: StepRecord[]
): Array<{ role: "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = []

  // Mensaje inicial con contexto del trigger
  const triggerContext = state.triggerData
    ? `\n\nDatos del trigger:\n${JSON.stringify(state.triggerData, null, 2)}`
    : ""

  const accumulated = state.context && Object.keys(state.context).length > 0
    ? `\n\nContexto acumulado:\n${JSON.stringify(state.context, null, 2)}`
    : ""

  messages.push({
    role: "user",
    content: `Analiza la situación y decide qué acción tomar. Si has terminado tu análisis, responde con tu conclusión final. Si necesitas escalar a un humano, indícalo claramente.${triggerContext}${accumulated}`,
  })

  // Historial de pasos previos (resumido para ahorrar tokens)
  for (const step of previousSteps) {
    if (step.thought) {
      messages.push({ role: "assistant", content: step.thought })
    }

    const toolSummary = step.toolCalls
      .map((tc) => `[Tool: ${tc.toolName}] → ${typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result)}`)
      .join("\n")

    if (toolSummary) {
      messages.push({ role: "user", content: `Resultados de herramientas:\n${toolSummary}\n\nContinúa tu análisis.` })
    }
  }

  return messages
}

// ─── Analizar resultado de un paso ─────────────────────────────

function analyzeResult(
  text: string | null,
  toolResults: ToolCallRecord[],
  previousStepCount: number
): StepObservation {
  const lowerText = (text ?? "").toLowerCase()

  const completionSignals = [
    "he completado",
    "análisis finalizado",
    "conclusión final",
    "no se requiere",
    "no hay anomalías",
    "todo dentro de parámetros",
    "tarea completada",
  ]

  const escalationSignals = [
    "escalar a humano",
    "requiere intervención",
    "no puedo resolver",
    "necesito ayuda humana",
    "escalación necesaria",
  ]

  const isComplete = completionSignals.some((s) => lowerText.includes(s))
  const shouldEscalate = escalationSignals.some((s) => lowerText.includes(s))

  const newContext: Record<string, unknown> = {}
  for (const tc of toolResults) {
    if (tc.toolName === "recordMemory" || tc.toolName === "emitEvent") continue
    newContext[`${tc.toolName}_result`] = tc.result
  }

  return {
    newContext,
    isComplete: isComplete || (toolResults.length === 0 && previousStepCount > 0),
    shouldEscalate,
    escalationReason: shouldEscalate ? text ?? undefined : undefined,
  }
}

// ─── Extraer tool calls del resultado de AI SDK v6 ─────────────

function extractToolCalls(result: Awaited<ReturnType<typeof generateText>>): ToolCallRecord[] {
  const calls: ToolCallRecord[] = []

  for (const step of result.steps ?? []) {
    for (const tc of step.toolCalls ?? []) {
      const matchingResult = (step.toolResults ?? []).find(
        (tr) => "toolCallId" in tr && tr.toolCallId === tc.toolCallId
      )
      calls.push({
        toolName: tc.toolName,
        args: ("args" in tc ? tc.args : {}) as Record<string, unknown>,
        result: matchingResult && "result" in matchingResult ? matchingResult.result : null,
      })
    }
  }

  return calls
}

// ─── Core Agent Loop ───────────────────────────────────────────

export async function runAgentLoop(
  definition: AgentDefinition,
  options: {
    triggerType?: ProcessTriggerType
    triggeredBy?: string
    initialState?: AgentRunState
    parentRunId?: string
  } = {}
): Promise<AgentExecutionResult> {
  const startTime = Date.now()

  const runId = await createAgentRun(definition.id, {
    triggerType: options.triggerType,
    triggeredBy: options.triggeredBy,
    maxSteps: definition.maxStepsPerRun,
    initialState: options.initialState,
    parentRunId: options.parentRunId,
  })

  const state: AgentRunState = options.initialState ?? { context: {} }
  const steps: StepRecord[] = []
  let totalTokens = 0
  let totalCost = 0
  let finalStatus: AgentStatus = AgentStatus.COMPLETED
  let finalError: string | undefined

  try {
    await updateAgentRun(runId, { status: AgentStatus.THINKING })

    for (let step = 0; step < definition.maxStepsPerRun; step++) {
      const stepStart = Date.now()

      // Check timeout
      if (Date.now() - startTime > definition.maxDurationMs) {
        finalError = `Timeout: excedido ${definition.maxDurationMs}ms`
        finalStatus = AgentStatus.FAILED
        break
      }

      // Check token budget
      if (totalTokens >= definition.maxTokensPerRun) {
        finalError = `Budget excedido: ${totalTokens} >= ${definition.maxTokensPerRun} tokens`
        finalStatus = AgentStatus.FAILED
        break
      }

      await updateAgentRun(runId, { status: AgentStatus.ACTING, currentStep: step })

      // Ejecutar generateText con tools — AI SDK v6 usa stopWhen
      const agentTools = definition.tools()
      const commonTools = getCommonAgentTools(definition.id)

      const result = await generateText({
        model: getChatLanguageModel(),
        system: definition.systemPrompt,
        messages: buildAgentMessages(state, steps),
        tools: { ...agentTools, ...commonTools },
        maxOutputTokens: definition.maxTokensPerStep,
        temperature: definition.temperature,
        stopWhen: stepCountIs(3),
      })

      // Contabilizar tokens
      const stepTokens = result.usage?.totalTokens ?? 0
      totalTokens += stepTokens
      totalCost += estimateCost(stepTokens)

      // Extraer tool calls
      const toolCalls = extractToolCalls(result)

      await updateAgentRun(runId, { status: AgentStatus.OBSERVING })

      const observation = analyzeResult(result.text, toolCalls, steps.length)
      const stepDurationMs = Date.now() - stepStart

      const stepRecord: StepRecord = {
        step,
        thought: result.text,
        toolCalls,
        observation,
        tokens: stepTokens,
        durationMs: stepDurationMs,
      }

      steps.push(stepRecord)
      state.context = { ...state.context, ...observation.newContext }

      // Checkpoint persistente
      await updateAgentRun(runId, {
        currentStep: step + 1,
        state: JSON.parse(JSON.stringify(state)) as Record<string, unknown>,
        steps: JSON.parse(JSON.stringify(steps)) as unknown as StepRecord[],
        totalTokens,
        totalCost,
        status: AgentStatus.THINKING,
      })

      if (observation.shouldEscalate) {
        finalStatus = AgentStatus.ESCALATED
        finalError = observation.escalationReason
        break
      }

      if (observation.isComplete) {
        finalStatus = AgentStatus.COMPLETED
        break
      }
    }
  } catch (error) {
    finalStatus = AgentStatus.FAILED
    finalError = error instanceof Error ? error.message : String(error)
    console.error(`[AGENT:${definition.id}] Error en loop:`, finalError)
  }

  const output = finalStatus === AgentStatus.COMPLETED
    ? { summary: steps[steps.length - 1]?.thought ?? null, context: state.context }
    : null

  await finalizeAgentRun(runId, finalStatus, {
    output: output as Record<string, unknown> | undefined,
    error: finalError,
    steps,
    totalTokens,
    totalCost,
  })

  return {
    runId,
    status: finalStatus,
    steps,
    output: output as Record<string, unknown> | null,
    totalTokens,
    totalCost,
    durationMs: Date.now() - startTime,
    error: finalError,
  }
}
