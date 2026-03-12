---
title: Ecosistema Agentico
description: Plan de evolucion de crons a agentes autonomos
---

# Ecosistema Agentico — Dreamland App

> Plan de arquitectura - Fecha: 2026-03-12

## Contexto

Dreamland tiene hoy 5 Vercel Cron jobs, 3 sync orchestrators (GStock 8 fases, Agora 4 fases, CoverManager), automatizacion de emails via n8n, y scripts CLI manuales. Todos siguen un patron "dispara y olvida": se ejecutan en horario fijo, hacen una accion, y terminan. No razonan, no aprenden, no se adaptan.

El objetivo es evolucionar a un **ecosistema de agentes autonomos** que:
- Observan datos post-sync y detectan anomalias
- Razonan sobre que hacer (investigar, alertar, actuar)
- Aprenden de correcciones humanas (memoria persistente)
- Se coordinan entre si via eventos
- Escalan a humanos cuando no estan seguros

La infraestructura AI existente (Vercel AI SDK v6, 3 providers LLM, Pinecone RAG, tool() con Zod, HyDE) es solida y se reutiliza directamente.

---

## Inventario actual de automatizaciones

### Vercel Cron Jobs (5)

| Cron | Horario | Accion |
|------|---------|--------|
| `cleanup-notifications` | Diario 2:00 UTC | Elimina notificaciones >30 dias |
| `cleanup-ai-logs` | Lunes 3:00 UTC | Elimina AIUsageLog >30 dias |
| `gstock-sync` | Diario 7:00 UTC | Sync 8 fases: GStock -> GastroLab -> RAG |
| `weather-check` | Diario 8:00 UTC | AEMET/OWM -> alertas meteo -> notificaciones |
| `watchdog` | Cada 15min | Limpia ProcessRuns estancados >30min |

### Sync Orchestrators (3)

| Orchestrator | Fases | Trigger |
|-------------|-------|---------|
| GStock Sync | 8 fases (units, categories, families, suppliers, ingredients, recipes, KB) | Cron diario + manual |
| Agora Sales | 4 fases (conexion, maestros, matching, ventas) | Script manual |
| CoverManager | 1 fase (fetch stats por location) | Script manual |

### Email Automation (via n8n)

- Gmail ingest -> clasificacion IA -> auto-draft GPT-4o-mini (few-shot tone learning)
- Endpoints: `/api/atc/email/ingest`, `/generate-draft`, `/ingest-attachment`
- Fire-and-forget via Next.js `after()` API

### Scripts CLI manuales

- `sync-food-costs.ts`, `sync-agora-sales.ts`, `sync-covers-from-covermanager.ts`
- `extract-tone-profile.ts`, `enrich-recipes-from-yurest.ts`

### Infraestructura AI existente

| Componente | Tecnologia | Ubicacion |
|-----------|-----------|-----------|
| LLM Providers | OpenRouter (GPT-4o-mini), Gemini, Groq | `src/lib/ai/` |
| SDK | Vercel AI SDK v6 | `streamText`, `generateText`, `tool()` |
| Embeddings | OpenAI text-embedding-3-small | `src/lib/embeddings.ts` |
| Vector DB | Pinecone v7 (multi-namespace) | `src/lib/pinecone.ts` |
| RAG | HyDE + domain registry | `src/modules/rag/` |
| Tools | 7 tools con Zod schemas | `src/lib/ai/tools.ts` |
| Email AI | Few-shot tone learning | `src/modules/atc/domain/draft-generator.ts` |
| Logging | AiUsageLog | `src/lib/actions/ai-usage.ts` |

---

## Decisiones arquitectonicas clave

### Serverless-compatible: Agent Loop Discretizado
Vercel no permite procesos continuos (max 300s). Cada "tick" del agente es una invocacion independiente que lee estado -> razona -> actua -> guarda estado.

```
[TRIGGER] --> [LOAD STATE] --> [THINK] --> [DECIDE] --> [ACT] --> [OBSERVE] --> [SAVE STATE]
  ^                                                                                |
  |                                                                                |
  +--- Cron tick / Webhook / Event ----- NEXT TICK (si quedan pasos) <------------+
```

### PostgreSQL como Event Bus
No se introduce Redis/BullMQ/Kafka. El volumen es bajo (~decenas de eventos/hora). Una tabla `AgentEvent` en PostgreSQL actua como cola de mensajes. El cron tick cada 5 min lee eventos pendientes y despacha.

### Supervisor Determinista (no LLM)
La coordinacion entre agentes es por reglas (codigo), no por otro LLM. Mas barato, predecible y debuggable. Los agentes individuales si usan LLM para razonar.

### No Event Sourcing completo
Se usa "event-inspired" (tabla de eventos como comunicacion) sin el overhead de event store, projections ni snapshots. `AgentRun.steps[]` (JSON) ya captura el historial de cada ejecucion.

---

## Fase 0 — Infraestructura Base

### 0.1 Modelo de datos Prisma

Anadir al schema existente:

```prisma
enum AgentStatus {
  QUEUED
  THINKING
  ACTING
  OBSERVING
  COMPLETED
  ESCALATED
  FAILED
  CANCELLED
}

model AgentRun {
  id          String       @id @default(cuid())
  agentId     String                              // "atc-agent", "sherlock-agent"
  status      AgentStatus  @default(QUEUED)
  triggerType ProcessTriggerType @default(SYSTEM)  // reutiliza enum existente
  triggeredBy String?

  // Estado del loop
  currentStep Int          @default(0)
  maxSteps    Int          @default(10)
  state       Json?                               // working memory acumulada
  steps       Json?                               // [{step, thought, action, observation, tokens, durationMs}]

  // Resultado
  output      Json?
  error       String?

  // Tokens y coste
  totalTokens Int          @default(0)
  totalCost   Float        @default(0)

  // Timing
  startedAt   DateTime     @default(now())
  finishedAt  DateTime?
  durationMs  Int?

  // Cadena de agentes (si un agente dispara otro)
  parentRunId String?
  parentRun   AgentRun?    @relation("AgentRunChain", fields: [parentRunId], references: [id])
  childRuns   AgentRun[]   @relation("AgentRunChain")

  @@index([agentId, startedAt(sort: Desc)])
  @@index([status])
  @@index([parentRunId])
  @@map("agent_runs")
}

model AgentMemory {
  id        String    @id @default(cuid())
  agentId   String
  type      String                                // "insight", "decision", "pattern", "correction"
  content   String    @db.Text
  metadata  Json?
  relevance Float     @default(1.0)               // decae con el tiempo
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  @@index([agentId, type])
  @@index([agentId, createdAt(sort: Desc)])
  @@map("agent_memories")
}

model AgentEvent {
  id          String    @id @default(cuid())
  eventType   String                              // "email.ingested", "cost.spike", "sync.completed"
  sourceAgent String?                             // null = sistema
  targetAgent String?                             // null = broadcast
  payload     Json
  processed   Boolean   @default(false)
  processedAt DateTime?
  createdAt   DateTime  @default(now())

  @@index([targetAgent, processed, createdAt])
  @@index([eventType, processed])
  @@map("agent_events")
}
```

Extender `NotificationType` con: `AGENT_ESCALATION`, `AGENT_INSIGHT`

### 0.2 Framework del agente — `src/lib/agents/`

| Fichero | Responsabilidad |
|---------|----------------|
| `types.ts` | `AgentDefinition`, `AgentTrigger`, `EscalationPolicy`, tipos de estado |
| `agent-runner.ts` | `withAgentExecution()` — analogo a `withProcessTracking()` de `src/lib/process-runner.ts` |
| `agent-loop.ts` | Core loop: Think->Act->Observe usando `generateText()` + `tools` del AI SDK v6 |
| `agent-registry.ts` | Catalogo de agentes — extiende patron de `src/modules/admin/domain/process-registry.ts` |
| `agent-memory.ts` | CRUD memorias + query por relevancia + decay temporal |
| `agent-events.ts` | Emitir/consumir eventos de `AgentEvent` |
| `agent-tools.ts` | Tools comunes: `recordMemory`, `emitEvent`, `escalateToHuman`, `queryMemories` |

### AgentDefinition (combina patrones de ProcessDefinition + KBDomain)

```typescript
interface AgentDefinition {
  id: string
  name: string
  description: string

  // LLM
  model?: string                       // default: getChatLanguageModel()
  systemPrompt: string
  maxTokensPerStep: number             // budget por paso (default: 600)
  temperature: number                  // default: 0.2

  // Capacidades
  tools: () => Record<string, Tool>    // factory como KBDomain.toolsFactory
  triggers: AgentTrigger[]

  // Seguridad
  maxStepsPerRun: number               // default: 10
  maxDurationMs: number                // default: 240_000 (4min)
  maxTokensPerRun: number              // budget total
  cooldownMs: number                   // entre runs

  // Escalacion
  escalationPolicy: EscalationPolicy

  // Vinculacion
  rbacResource: string
  module: string
}

interface AgentTrigger {
  type: "cron" | "webhook" | "event" | "manual"
  config: string
}

interface EscalationPolicy {
  onLowConfidence: number             // umbral para escalar (0-1)
  onError: "retry" | "escalate" | "skip"
  maxRetries: number
  escalateTo: "notification" | "human-review" | "supervisor-agent"
}
```

### Core Agent Loop (pseudocodigo)

```typescript
async function runAgentLoop(def: AgentDefinition, run: AgentRun) {
  let state = run.state ?? {}
  const steps = (run.steps as StepRecord[]) ?? []

  for (let step = run.currentStep; step < def.maxStepsPerRun; step++) {
    if (Date.now() - run.startedAt.getTime() > def.maxDurationMs) break

    const result = await generateText({
      model: getChatLanguageModel(),
      system: def.systemPrompt,
      messages: buildAgentMessages(state, steps),
      tools: { ...def.tools(), ...getCommonAgentTools(def.id) },
      maxOutputTokens: def.maxTokensPerStep,
      temperature: def.temperature,
      maxSteps: 3,
    })

    const observation = analyzeResult(result)
    steps.push({ step, thought: result.text, toolCalls: result.toolResults, observation })
    state = { ...state, ...observation.newContext }

    // Checkpoint persistente
    await updateAgentRun(run.id, { currentStep: step + 1, state, steps, totalTokens: ... })

    if (observation.isComplete || observation.shouldEscalate) break
  }

  return finalizeRun(run, state, steps)
}
```

### 0.3 Rutas API

| Ruta | Metodo | Funcion |
|------|--------|---------|
| `/api/agents/[agentId]/run` | POST | Trigger manual/webhook |
| `/api/agents/[agentId]/status` | GET | Estado del ultimo run |
| `/api/cron/agent-tick` | GET | Cron cada 5min: lee eventos pendientes, activa agentes |

Anadir a `vercel.json`:
```json
{ "path": "/api/cron/agent-tick", "schedule": "*/5 * * * *" }
```

### 0.4 Extender Watchdog

Modificar `/api/cron/watchdog` para incluir `AgentRun` con status THINKING/ACTING/OBSERVING > 30min -> marcar FAILED.

### 0.5 Extender ProcessDefinition

Anadir categoria `"agent"` al type union de `ProcessDefinition` en `src/modules/admin/domain/process-registry.ts`.

### Ficheros a modificar/crear — Fase 0

- **Crear**: `src/lib/agents/types.ts`, `agent-runner.ts`, `agent-loop.ts`, `agent-registry.ts`, `agent-memory.ts`, `agent-events.ts`, `agent-tools.ts`
- **Crear**: `src/app/api/agents/[agentId]/run/route.ts`, `status/route.ts`
- **Crear**: `src/app/api/cron/agent-tick/route.ts`
- **Crear**: migracion Prisma (AgentRun, AgentMemory, AgentEvent, NotificationType extension)
- **Modificar**: `src/modules/admin/domain/process-registry.ts` — anadir categoria `"agent"`
- **Modificar**: `vercel.json` — anadir cron agent-tick
- **Modificar**: `src/app/api/cron/watchdog/route.ts` — incluir agent_runs
- **Modificar**: `prisma/schema.prisma` — nuevos modelos y enums

---

## Fase 1 — ATC Agent (primer agente funcional)

**Por que primero**: ya tiene ~80% de la logica implementada (draft-generator, gmail-service, tools RAG, email ingest pipeline).

### Definicion del agente

Ubicacion: `src/modules/atc/agents/atc-agent.ts`

**Tools (reutilizados)**:
- `searchKnowledgeBase` — de `src/app/api/rag/[domain]/chat/tools.ts`
- `lookupReservation` — de `src/app/api/atc/chat/route.ts`
- `getActiveIncidents` — de `src/app/api/atc/chat/route.ts`
- `checkWaitingList` — de `src/app/api/atc/chat/route.ts`

**Tools (nuevos)**:
- `classifyEmail` — LLM clasifica email (reemplaza n8n clasificador)
- `lookupClientHistory` — busca emails previos del mismo remitente
- `draftReply` — wrapper sobre `generateEmailDraft()` de `src/modules/atc/domain/draft-generator.ts`
- `sendEmail` — wrapper sobre `src/modules/atc/domain/gmail-service.ts` con safeguard (solo si confidence >= 0.9)
- `escalateToHuman` — crea notificacion AGENT_ESCALATION
- `recordMemory` — guarda insight en AgentMemory

**Flujo**:
1. Evento `email.ingested` -> ATC Agent se activa
2. Carga email + thread context + historial cliente
3. Busca en KB (info restaurante, reservas, incidencias)
4. Clasifica el email (categoria, prioridad, actionRequired)
5. Decide: draft reply con confidence score
6. Si confidence >= 0.9 Y categoria conocida -> puede enviar automaticamente
7. Si no -> escala a humano con el draft como sugerencia

**Modo shadow** (primera fase): el agente corre en paralelo al flujo n8n existente. No envia emails realmente. Compara sus clasificaciones y drafts con las del humano para calibrar.

### Ficheros a crear/modificar — Fase 1

- **Crear**: `src/modules/atc/agents/atc-agent.ts`
- **Crear**: `src/modules/atc/agents/tools/classify-email.ts`, `lookup-client-history.ts`
- **Modificar**: `src/app/api/atc/email/ingest/route.ts` — emitir `AgentEvent` tipo `email.ingested`
- **Crear**: UI dashboard de observabilidad en `/admin/agents` (vista minima)

---

## Fase 2 — Sherlock Agent (deteccion de anomalias de coste)

**Trigger**: Evento `sync.food-cost.completed` + cron diario post-sync

**Tools (reutilizados)** — wrappers sobre actions existentes sin capa RBAC:
- `getFoodCostKpis`, `getFoodCostByCategory`, `getFoodCostByLocation`
- `getStockAlerts`, `getWasteRecords`

**Tools (nuevos)**:
- `compareWithPreviousPeriod` — calcula deltas vs periodo anterior
- `investigateIngredientCost` — busca ingredientes con mayor variacion de precio
- `generateInsightReport` — genera resumen en lenguaje natural
- `notifyKitchenTeam` — notificacion dirigida al equipo de cocina

**Flujo**: Post-sync -> analiza KPIs -> detecta anomalias (food cost sube >2pp, merma atipica) -> investiga causas -> genera insight con recomendacion -> guarda en AgentMemory -> notifica.

### Ficheros a crear — Fase 2

- `src/modules/sherlock/agents/sherlock-agent.ts`
- `src/modules/sherlock/agents/tools/*.ts`
- Emitir evento `sync.food-cost.completed` en el script de food cost sync

---

## Fase 3 — Analytics Agent + Calidad Agent

### Analytics Agent
- **Trigger**: `sync.agora.completed` + cron matutino
- Genera "morning briefing": ventas ayer, comparativa semanal, tendencias
- Detecta patrones: "los jueves caen las ventas un 15%"
- Correlaciona: ventas vs comensales vs meteo

### Calidad Agent
- **Trigger**: `sync.gstock.completed` + cron semanal
- Ejecuta auditorias periodicas con `runFullAuditCore()`
- Compara con historial, detecta degradacion de calidad de datos

---

## Fase 4 — Orquestador + Dashboard Admin

### Supervisor determinista
Funcion (no LLM) que:
- Decide orden de ejecucion cuando hay multiples eventos
- Agrega insights de todos los agentes en resumen diario
- Gestiona presupuesto global de tokens
- Detecta contradicciones entre agentes

### Dashboard `/admin/agents`
- Lista de agentes con estado, ultimo run, tokens consumidos
- Drill-down: historial de runs con pasos detallados (thought/action/observation)
- Grafica de coste de tokens por agente/dia
- Panel de eventos y cola
- "Morning report" que combina insights de todos los agentes

---

## Fase 5 — Retiro gradual de n8n

1. Mover clasificacion de emails de n8n -> ATC Agent (Fase 1 ya prepara)
2. Mover ingesta Gmail de n8n -> cron interno + gmail-service.ts existente
3. Mantener n8n como fallback 1-2 meses
4. Descomisionar

---

## Patron de orquestacion

### Supervisor Determinista + Agentes Autonomos (Hibrido)

Se descarta "Swarm" (agentes delegando entre si via LLM) por coste de tokens y complejidad de debug.

```
[Cron Tick 5min]
      |
      v
[Supervisor: lee eventos pendientes, decide que agentes activar]
      |
      +--- trigger ---> [ATC Agent]    --- event: email.processed --->
      +--- trigger ---> [Sherlock]     --- event: cost.insight --->
      +--- trigger ---> [Analytics]    --- event: sales.briefing --->
      |
      v
[Supervisor: agrega resultados, genera resumen si procede]
```

1. **Cada agente opera independientemente** dentro de su dominio
2. **Events como coordinacion**: cuando un agente termina, emite un evento. Otros agentes se suscriben a eventos relevantes
3. **Supervisor determinista**: orquesta el orden, gestiona presupuesto, agrega resultados
4. **Escalacion a humano**: siempre disponible como escape valve

---

## Mitigacion de riesgos

### Control de costes
| Medida | Mecanismo |
|--------|-----------|
| Budget por run | `maxTokensPerRun` en AgentDefinition, loop para si excede |
| Budget diario | Config global, cron tick verifica antes de disparar |
| Modelo economico | GPT-4o-mini (~$0.15/1M input tokens) por defecto |
| Prompts compactos | System prompts < 500 tokens |
| **Estimacion mensual** | 5 agentes x 1-3 runs/dia x ~500 tokens/paso x ~50 pasos/dia = **~$3/mes** |

### Agentes desbocados
| Riesgo | Mitigacion |
|--------|-----------|
| Loop infinito | `maxStepsPerRun` hard limit (10) + `maxDurationMs` (240s) |
| Spam de acciones | `cooldownMs` entre runs |
| Error en cascada | `onError: "retry" / "escalate" / "skip"` con maxRetries=2 |
| Email incorrecto | Modo shadow obligatorio. Threshold confidence 0.9 para envio auto |
| Gasto excesivo | `totalTokens < maxTokensPerRun` verificado en cada paso |

### Observabilidad
- `AgentRun.steps[]` — cada thought/action/observation persistido
- `AiUsageLog` existente — tracking de tokens
- `AgentEvent` — trazabilidad completa inter-agente
- Watchdog extendido — detecta runs estancados
- Notificaciones in-app — escalaciones y insights

---

## Skills a importar de antigravity-awesome-skills

Copiar a `.claude/skills/` antes de empezar la implementacion:

| Skill | Justificacion |
|-------|---------------|
| `autonomous-agent-patterns` | Patron Think->Decide->Act->Observe, permisos, sandboxing |
| `agent-memory-systems` | Diseno de memoria corta/larga/episodica/semantica |
| `agent-tool-builder` | Diseno de schemas de tools para LLMs |
| `vercel-ai-sdk-expert` | Patrones avanzados de AI SDK v6 con Next.js |
| `workflow-orchestration-patterns` | Coordinacion y orquestacion de flujos |

**No importar** (overkill para el volumen actual): bullmq-specialist, saga-orchestration, cqrs-implementation, multi-agent-patterns completo.

---

## Verificacion

### Fase 0
- [ ] Migracion Prisma ejecutada sin errores
- [ ] `withAgentExecution()` crea y finaliza `AgentRun` correctamente
- [ ] Agent loop ejecuta pasos con mock de LLM y persiste checkpoints
- [ ] Cron `agent-tick` lee eventos y dispara agentes correctamente
- [ ] Watchdog detecta agent runs estancados
- [ ] Tests unitarios del agent loop pasan

### Fase 1
- [ ] ATC Agent clasifica emails correctamente en modo shadow
- [ ] Drafts generados son comparables a los actuales (n8n)
- [ ] Escalacion a humano funciona via notificacion
- [ ] AgentMemory acumula insights de interacciones previas
- [ ] Dashboard muestra runs con pasos detallados

### General
- [ ] Coste diario de tokens dentro del presupuesto estimado
- [ ] Ningun agente excede maxStepsPerRun ni maxDurationMs
- [ ] Los crons existentes siguen funcionando sin cambios (degradacion gradual)
