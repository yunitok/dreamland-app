---
title: Guia de Desarrollo de Agentes
description: Como crear, configurar y desplegar nuevos agentes en el ecosistema agentico
---

# Guia de Desarrollo de Agentes

## Crear un Nuevo Agente

### 1. Definir el Agente

Crear `src/modules/{modulo}/agents/{nombre}-agent.ts`:

```typescript
import { tool } from "ai"
import { z } from "zod"
import { registerAgent } from "@/lib/agents/agent-registry"
import { AGENT_DEFAULTS } from "@/lib/agents/types"
import type { AgentDefinition } from "@/lib/agents/types"

// Definir tools del agente
function createMyTool() {
  const schema = z.object({
    param: z.string().describe("Descripcion clara para el LLM"),
  })

  return tool({
    description: "Que hace este tool y cuando usarlo.",
    inputSchema: schema,
    execute: async (input: z.infer<typeof schema>) => {
      // Logica sin RBAC (los agentes corren como sistema)
      return { result: "ok" }
    },
  })
}

export const MY_AGENT: AgentDefinition = {
  id: "my-agent",
  name: "My Agent",
  description: "Descripcion para el dashboard admin.",
  icon: "Bot",         // Nombre de icono Lucide
  module: "mi-modulo",

  systemPrompt: `Instrucciones claras con:
1. MISION del agente
2. PASOS a seguir
3. UMBRALES de alerta
4. SENALES DE FINALIZACION (el loop las detecta)`,

  maxTokensPerStep: AGENT_DEFAULTS.maxTokensPerStep,
  temperature: 0.2,

  tools: () => ({
    myTool: createMyTool(),
  }),

  triggers: [
    { type: "event", config: "my-domain.event-type" },
  ],

  maxStepsPerRun: 8,
  maxDurationMs: 240_000,
  maxTokensPerRun: 10_000,
  cooldownMs: 60_000,

  escalationPolicy: {
    onLowConfidence: 0.5,
    onError: "escalate",    // "retry" | "escalate" | "skip"
    maxRetries: 1,
    escalateTo: "notification",
  },

  rbacResource: "mi-modulo",
}

registerAgent(MY_AGENT)
```

### 2. Registrar el Agente

Anadir import en `src/lib/agents/register-all.ts`:

```typescript
import "@/modules/mi-modulo/agents/my-agent"
```

### 3. Emitir Eventos que Disparen el Agente

En el punto del codigo donde el agente debe activarse:

```typescript
import { emitAgentEvent } from "@/lib/agents/agent-events"

await emitAgentEvent("my-domain.event-type", {
  // Payload con datos relevantes
  entityId: "...",
  context: { ... },
}, {
  targetAgent: "my-agent",  // null para broadcast
})
```

El cron `agent-tick` (cada 5 min) leera el evento y ejecutara el agente.

---

## Patrones de Diseno de Tools

### Reglas Criticas

1. **Usar `inputSchema`** (NO `parameters`) — convencion del proyecto con AI SDK v6
2. **Tipar explicitamente** el parametro `execute` con `z.infer<typeof schema>`
3. **Zod v4**: `z.record(z.string(), z.unknown())` (2 argumentos)
4. **Descriptions claras**: el LLM solo ve schema + description. Incluir ejemplos
5. **Sin RBAC**: los tools de agentes consultan Prisma directamente
6. **Prisma JSON**: usar `JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue`

### Estructura Recomendada

```
src/modules/{modulo}/agents/
  {nombre}-agent.ts     Definicion + tools inline simples
  tools/
    tool-complejo.ts    Tools que requieren su propio fichero
```

### Ejemplo de Tool con Error Handling

```typescript
const schema = z.object({
  id: z.string().describe("ID del recurso a consultar"),
})

return tool({
  description:
    "Obtiene detalles del recurso X. " +
    "Retorna error si no existe. " +
    "Usa esto cuando necesites verificar el estado de X.",
  inputSchema: schema,
  execute: async (input: z.infer<typeof schema>) => {
    const item = await prisma.resource.findUnique({
      where: { id: input.id },
    })
    if (!item) return { error: `Recurso ${input.id} no encontrado` }
    return { id: item.id, name: item.name, status: item.status }
  },
})
```

---

## System Prompts — Buenas Practicas

El system prompt es critico para que el agente se comporte correctamente:

### Estructura Recomendada

```
1. ROL: "Eres el agente de X del grupo Voltereta."
2. MISION: lista numerada de pasos
3. REGLAS: restricciones especificas
4. UMBRALES: valores numericos para decisiones
5. SENALES DE FINALIZACION: frases que el loop detecta
```

### Senales de Finalizacion

El `agent-loop.ts` detecta estas frases en el texto del LLM:

**Completado**: "he completado", "analisis finalizado", "conclusion final", "no se requiere", "no hay anomalias", "todo dentro de parametros", "tarea completada"

**Escalacion**: "escalar a humano", "requiere intervencion", "no puedo resolver", "necesito ayuda humana", "escalacion necesaria"

---

## Trigger Manual

```bash
curl -X POST http://localhost:3000/api/agents/my-agent/run \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "manual-test"}'
```

## Consultar Estado

```bash
curl http://localhost:3000/api/agents/my-agent/status \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Memoria del Agente

Los agentes pueden guardar y consultar memorias persistentes:

| Tipo | Uso |
|------|-----|
| `insight` | Hallazgo que el agente ha descubierto |
| `decision` | Decision tomada por el agente |
| `pattern` | Patron recurrente detectado |
| `correction` | Correccion recibida de un humano |

Las memorias tienen **decay temporal** (relevancia decrece con el tiempo) y **TTL opcional**.

---

## Depuracion

### Ver runs de un agente

```sql
SELECT id, status, "currentStep", "totalTokens", error, "startedAt"
FROM agent_runs
WHERE "agentId" = 'my-agent'
ORDER BY "startedAt" DESC
LIMIT 10;
```

### Ver pasos detallados de un run

```sql
SELECT id, steps
FROM agent_runs
WHERE id = 'run-id';
```

El campo `steps` es un JSON array con estructura:
```json
[{
  "step": 0,
  "thought": "Texto del LLM",
  "toolCalls": [{"toolName": "...", "args": {}, "result": {}}],
  "observation": {"isComplete": false, "shouldEscalate": false},
  "tokens": 450,
  "durationMs": 2300
}]
```

### Ver memorias

```sql
SELECT * FROM agent_memories
WHERE "agentId" = 'my-agent'
ORDER BY "createdAt" DESC;
```

### Ver eventos

```sql
SELECT * FROM agent_events
WHERE processed = false
ORDER BY "createdAt" ASC;
```

---

## Checklist para Nuevo Agente

- [ ] Definir `AgentDefinition` con system prompt, tools, triggers, limites
- [ ] Crear tools con `inputSchema` (Zod v4) y descriptions claras
- [ ] Registrar en `register-all.ts`
- [ ] Emitir evento en el punto de activacion
- [ ] Verificar `tsc --noEmit` sin errores
- [ ] Probar con trigger manual via API
- [ ] Revisar runs en dashboard `/admin/agents`
