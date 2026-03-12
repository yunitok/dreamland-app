/**
 * Agent Framework — exports públicos del ecosistema agéntico.
 */

// Tipos
export type {
  AgentDefinition,
  AgentTrigger,
  EscalationPolicy,
  StepRecord,
  ToolCallRecord,
  StepObservation,
  AgentRunState,
  AgentExecutionResult,
} from "./types"
export { AGENT_DEFAULTS, AGENT_CATEGORIES } from "./types"

// Registry
export { registerAgent, getAgentDefinition, getAllAgentDefinitions, getAgentsByModule, getAgentsByTriggerType, getAgentsForEventType } from "./agent-registry"

// Runner
export { createAgentRun, updateAgentRun, finalizeAgentRun, checkAgentCooldown, checkAgentNotRunning, getLastAgentRun } from "./agent-runner"

// Loop
export { runAgentLoop } from "./agent-loop"

// Memory
export { createAgentMemory, queryAgentMemories, decayMemoryRelevance, cleanupExpiredMemories } from "./agent-memory"

// Events
export { emitAgentEvent, consumePendingEvents, markEventsProcessed, getUnprocessedEventsByType, cleanupOldEvents } from "./agent-events"

// Tools
export { getCommonAgentTools } from "./agent-tools"

// Orchestrator
export { checkDailyBudget, getDailyAgentSummary, getRecentInsights, getPendingEventsCount, getRecentEvents } from "./orchestrator"
