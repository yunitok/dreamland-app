/**
 * Agent Framework — tipos y contratos del ecosistema agéntico.
 *
 * Combina patrones de ProcessDefinition (process-registry.ts) y
 * KBDomain (rag/domain/types.ts) para definir agentes autónomos.
 */

import type { Tool } from "ai"
import type { AgentStatus, ProcessTriggerType } from "@prisma/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = Tool<any, any>

// ─── Agent Definition ──────────────────────────────────────────

export interface AgentTrigger {
  type: "cron" | "webhook" | "event" | "manual"
  /** Cron expression, event type name, o descriptor */
  config: string
}

export interface EscalationPolicy {
  /** Umbral de confianza por debajo del cual se escala (0-1) */
  onLowConfidence: number
  /** Qué hacer cuando hay error */
  onError: "retry" | "escalate" | "skip"
  /** Reintentos máximos antes de escalar */
  maxRetries: number
  /** A quién escalar */
  escalateTo: "notification" | "human-review" | "supervisor-agent"
}

export interface AgentDefinition {
  /** Identificador único del agente: "atc-agent", "sherlock-agent" */
  id: string
  /** Nombre visible */
  name: string
  description: string
  /** Icono Lucide para UI */
  icon: string
  /** Módulo asociado */
  module: string

  // ── LLM ──
  /** System prompt del agente */
  systemPrompt: string
  /** Tokens máximos por paso (default: 600) */
  maxTokensPerStep: number
  /** Temperatura del LLM (default: 0.2) */
  temperature: number

  // ── Capacidades ──
  /** Factory de tools del agente (patrón KBDomain.toolsFactory) */
  tools: () => Record<string, AnyTool>
  /** Cuándo se activa */
  triggers: AgentTrigger[]

  // ── Seguridad ──
  /** Pasos máximos del loop por ejecución */
  maxStepsPerRun: number
  /** Timeout total en ms */
  maxDurationMs: number
  /** Budget total de tokens por ejecución */
  maxTokensPerRun: number
  /** Cooldown entre ejecuciones en ms */
  cooldownMs: number

  // ── Escalación ──
  escalationPolicy: EscalationPolicy

  // ── RBAC ──
  /** Recurso RBAC para permisos */
  rbacResource: string
}

// ─── Defaults ──────────────────────────────────────────────────

export const AGENT_DEFAULTS = {
  maxTokensPerStep: 600,
  temperature: 0.2,
  maxStepsPerRun: 10,
  maxDurationMs: 240_000,     // 4 min
  maxTokensPerRun: 8_000,
  cooldownMs: 60_000,         // 1 min
} as const

// ─── Step Record ───────────────────────────────────────────────

export interface StepRecord {
  step: number
  thought: string | null
  toolCalls: ToolCallRecord[]
  observation: StepObservation
  tokens: number
  durationMs: number
}

export interface ToolCallRecord {
  toolName: string
  args: Record<string, unknown>
  result: unknown
}

export interface StepObservation {
  /** Nuevo contexto que se acumula en el state */
  newContext: Record<string, unknown>
  /** El agente considera que ha terminado */
  isComplete: boolean
  /** El agente quiere escalar a humano */
  shouldEscalate: boolean
  /** Razón de la escalación */
  escalationReason?: string
}

// ─── Agent Run State ───────────────────────────────────────────

export interface AgentRunState {
  /** Contexto acumulado paso a paso */
  context: Record<string, unknown>
  /** Datos iniciales del trigger (payload del evento, etc.) */
  triggerData?: Record<string, unknown>
}

// ─── Agent Execution Result ────────────────────────────────────

export interface AgentExecutionResult {
  runId: string
  status: AgentStatus
  steps: StepRecord[]
  output: Record<string, unknown> | null
  totalTokens: number
  totalCost: number
  durationMs: number
  error?: string
}

// ─── Agent Category (extiende ProcessDefinition) ───────────────

export const AGENT_CATEGORIES = {
  agent: { label: "Agentes IA", color: "text-violet-500" },
} as const

// ─── Re-export tipos de Prisma usados ──────────────────────────

export type { AgentStatus, ProcessTriggerType }
