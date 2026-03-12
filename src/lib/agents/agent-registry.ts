/**
 * Agent Registry — catálogo de agentes disponibles.
 *
 * Extiende el patrón de process-registry.ts.
 * Cada módulo registra su agente importando registerAgent().
 */

import type { AgentDefinition } from "./types"

// ─── Registry interno ──────────────────────────────────────────

const agentRegistry = new Map<string, AgentDefinition>()

// ─── Registrar agente ──────────────────────────────────────────

export function registerAgent(definition: AgentDefinition): void {
  if (agentRegistry.has(definition.id)) {
    console.warn(`[AGENT_REGISTRY] Agente '${definition.id}' ya registrado, se sobreescribe.`)
  }
  agentRegistry.set(definition.id, definition)
}

// ─── Consultar agentes ─────────────────────────────────────────

export function getAgentDefinition(agentId: string): AgentDefinition | undefined {
  return agentRegistry.get(agentId)
}

export function getAllAgentDefinitions(): AgentDefinition[] {
  return Array.from(agentRegistry.values())
}

export function getAgentsByModule(module: string): AgentDefinition[] {
  return getAllAgentDefinitions().filter((a) => a.module === module)
}

export function getAgentsByTriggerType(type: "cron" | "webhook" | "event" | "manual"): AgentDefinition[] {
  return getAllAgentDefinitions().filter((a) =>
    a.triggers.some((t) => t.type === type)
  )
}

// ─── Agentes que escuchan un tipo de evento ────────────────────

export function getAgentsForEventType(eventType: string): AgentDefinition[] {
  return getAllAgentDefinitions().filter((a) =>
    a.triggers.some((t) => t.type === "event" && t.config === eventType)
  )
}
