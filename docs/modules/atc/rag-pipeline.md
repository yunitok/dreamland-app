---
title: Pipeline RAG — Embeddings, Búsqueda y Chat IA
description: Arquitectura completa del pipeline RAG con HyDE, Pinecone y chat con herramientas
---

# 🤖 Pipeline RAG — Retrieval-Augmented Generation

## ¿Qué es el RAG de ATC?

El sistema RAG (Retrieval-Augmented Generation) del módulo ATC permite que el asistente responda preguntas con información **verificada y actualizada** del restaurante, en lugar de depender del conocimiento genérico del LLM.

El pipeline tiene dos fases principales:

1. **Indexación** (offline) — Las entradas de KB se convierten en vectores y se almacenan en Pinecone
2. **Recuperación** (online) — Cuando el usuario hace una pregunta, se buscan los fragmentos más relevantes y se inyectan en el contexto del LLM

---

## 🧱 Componentes del Stack

| Componente | Tecnología | Rol |
|------------|-----------|-----|
| Embeddings | `text-embedding-3-small` via OpenRouter | Convertir texto a vectores de 1536 dimensiones |
| Vector DB | Pinecone v7 (serverless) | Almacenamiento y búsqueda de similaridad coseno |
| LLM Normalización | `gpt-4o-mini` via OpenRouter | Chunking y estructuración del conocimiento |
| LLM HyDE | `gemini-2.0-flash-lite` via OpenRouter | Generación de respuesta hipotética para mejorar retrieval |
| LLM Chat | Configurable (default `gpt-4o-mini`) | Respuesta final con tool calling |
| Framework | Vercel AI SDK v6 | Streaming y tool orchestration |

---

## 📡 Fase de Indexación

### 1. Generación de Embeddings

```typescript
// src/lib/embeddings.ts
const EMBEDDING_MODEL = "openai/text-embedding-3-small"

// Embedding individual (crear/actualizar una entrada)
export async function generateEmbedding(text: string): Promise<number[]>

// Embedding en lote de 100 (importación masiva)
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]>
```

El texto que se embeddea no es solo el contenido, sino una composición que incluye el título y la sección:

```typescript
// src/lib/embeddings.ts
export function buildKBText(title: string, content: string, section?: string | null): string {
  return section ? `${title} — ${section}\n\n${content}` : `${title}\n\n${content}`
}
```

Incluir el título en el texto embeddedo mejora significativamente el recall, ya que el vector captura tanto el tema (título) como el contenido.

### 2. Metadatos del Vector

Cada vector en Pinecone almacena metadatos que permiten filtrar sin recurrir a la DB:

```typescript
interface KBVectorMetadata {
  title: string
  section?: string
  categoryId?: string
  source: string
  language?: string
  active: boolean    // ← Filtro principal en búsquedas
}
```

### 3. Sincronización KB ↔ Pinecone

Las server actions mantienen la sincronización automáticamente:

| Operación KB | Acción Pinecone |
|-------------|----------------|
| Crear entrada | `upsertKnowledgeVector()` |
| Actualizar entrada | `upsertKnowledgeVector()` (misma ID) |
| Toggle activo/inactivo | `upsertKnowledgeVector()` (actualiza `active`) |
| Eliminar entrada | `deleteKnowledgeVectors([id])` |
| Borrar por source | `deleteVectorsBySource(source)` |

---

## 🔍 Fase de Recuperación — HyDE Progresivo

La búsqueda implementa una estrategia en dos etapas llamada **HyDE (Hypothetical Document Embeddings)**:

```
Pregunta del usuario
        │
        ▼
┌────────────────────────────────────────────┐
│  Etapa 1: Búsqueda directa                 │
│  query → embedding → Pinecone (top-5)      │
│  threshold: 0.65                           │
└───────────────────────────┬────────────────┘
                            │
              ¿topScore < 0.70?
              ┌─────────────┴─────────────┐
             Sí                          No
              │                           │
              ▼                           │
┌─────────────────────────────────────┐   │
│  Etapa 2: HyDE                      │   │
│  query → LLM hipotético →          │   │
│  respuesta hipotética + query       │   │
│  → embedding → Pinecone (top-5)    │   │
│  threshold: 0.55                    │   │
└─────────────────┬───────────────────┘   │
                  │                       │
                  ▼                       ▼
        Fusionar resultados (dedup por ID, max score)
                  │
                  ▼
        Top-5 resultados finales
```

### ¿Por qué HyDE funciona?

El problema clásico del RAG: una pregunta informal (`"¿tenéis mesas para 8?"`) tiene un vector semántico diferente a una respuesta estructurada (`"Disponemos de salones privados para grupos de 8 a 20 personas..."`). HyDE soluciona esto generando primero una respuesta hipotética que estará en el mismo espacio semántico que las entradas indexadas.

### Umbrales de Similaridad

```typescript
// src/app/api/atc/chat/tools.ts
const SCORE_THRESHOLD_DIRECT = 0.65  // Mínimo para búsqueda directa
const SCORE_THRESHOLD_HYDE = 0.55    // Mínimo para búsqueda HyDE (más permisivo)
const HYDE_TRIGGER = 0.70            // Si top score < 0.70 → activar HyDE
```

Un score de 0.65 equivale a similaridad coseno del 65%, que en la práctica indica contenido "bastante relacionado". El threshold HyDE es más permisivo (0.55) porque la respuesta hipotética ya actúa como filtro semántico.

### Generación de Respuesta Hipotética

```typescript
// src/lib/embeddings.ts
export async function generateHyDEQuery(userQuery: string): Promise<string> {
  // Genera 2-3 frases como si el restaurante respondiera
  const hypothetical = await llm.complete("Eres un experto en restaurantes...")
  // Combina la respuesta hipotética con la query original
  return `${hypothetical}\n\n${userQuery}`
}
```

La combinación `hipotética + query original` captura ambas señales semánticas: la precisión de la respuesta hipotética y el léxico exacto del usuario.

---

## 💬 Chat con Herramientas

### Arquitectura del Endpoint

```typescript
// src/app/api/atc/chat/route.ts
const result = streamText({
  model: getChatLanguageModel(),
  temperature: 0.1,           // Baja temperatura → respuestas más precisas y reproducibles
  maxOutputTokens: 600,
  stopWhen: stepCountIs(5),   // Máximo 5 iteraciones de tool calling
  system: SYSTEM_PROMPT,
  messages: history,          // Últimas 6 mensajes de la conversación
  tools: { ... },
})
return result.toUIMessageStreamResponse()
```

El `stopWhen: stepCountIs(5)` previene bucles infinitos de tool calling. En la práctica, la mayoría de respuestas requieren 1-2 iteraciones.

### Herramientas Disponibles

#### `searchKnowledgeBase`
La herramienta principal. Implementa HyDE progresivo:

```typescript
inputSchema: z.object({
  query: z.string(),          // Pregunta en lenguaje natural
  categoryFilter: z.string().optional(),  // UUID de categoría (opcional)
})
// Devuelve: Array<{ id, title, section, content }>
```

El agente debe citar la fuente al usar esta herramienta: `[Fuente: nombre]`.

#### `lookupReservation`
Busca reservas activas (no CANCELLED ni NO_SHOW):

```typescript
inputSchema: z.object({
  guestName: z.string().optional(),  // Búsqueda parcial insensible a mayúsculas
  date: z.string().optional(),       // Formato YYYY-MM-DD
})
// Devuelve: máximo 5 reservas ordenadas por fecha/hora
```

#### `getActiveIncidents`
Incidencias activas (OPEN o IN_PROGRESS) + alertas meteorológicas:

```typescript
inputSchema: z.object({})  // Sin parámetros — siempre devuelve el estado actual
// Devuelve: incidents[], weatherAlerts[], hasActiveIssues: boolean
```

#### `checkWaitingList`
Lista de espera sin notificar para una fecha:

```typescript
inputSchema: z.object({
  date: z.string(),  // Formato YYYY-MM-DD
})
// Devuelve: totalWaiting, primeras 8 entradas ordenadas por prioridad
```

### Sistema de Prompt

```
Eres el asistente ATC de Dreamland Restaurant.

REGLAS ESTRICTAS:
1. Para info de espacios/menús/alérgenos/horarios → usa SIEMPRE searchKnowledgeBase
2. Para reservas → usa lookupReservation
3. NUNCA inventes datos. Si no hay resultados → indícalo claramente
4. Responde en español, profesional, conciso y amable
5. Cita la fuente: [Fuente: nombre]
6. Si no puedes ayudar, indica qué información necesitarías
```

La temperatura de 0.1 y las reglas estrictas previenen alucinaciones.

---

## 📊 Trazabilidad de Consultas

Cada conversación queda registrada en base de datos al finalizar el streaming:

```typescript
// src/app/api/atc/chat/route.ts — onFinish callback
const query = await prisma.query.create({
  data: {
    guestInput: userQuery,
    categoryId: defaultCategory.id,
    channel: "WEB_RAG",
    status: scoreRef.value > 0 ? "RESOLVED" : "OPEN",  // Según si hubo match en KB
    confidenceScore: scoreRef.value,                      // Score coseno máximo obtenido
    resolvedBy: session.user?.id,
  },
})
await prisma.queryResolution.create({
  data: {
    queryId: query.id,
    responseText: text,       // Texto completo de la respuesta del LLM
    source: "AI",
  },
})
```

El `scoreRef` se pasa por referencia a la tool `searchKnowledgeBase` y captura el score máximo obtenido durante la sesión. Si es > 0, la consulta se marca como `RESOLVED`.

---

## ⚙️ Configuración de Pinecone

### Setup del Índice

El cliente Pinecone usa lazy initialization con singleton:

```typescript
// src/lib/pinecone.ts
let _pinecone: Pinecone | null = null
let _index: Index | null = null

export function getPineconeIndex(): Index {
  if (!_index) {
    _index = getPineconeClient().index(process.env.PINECONE_INDEX_NAME || "dreamland-atc")
  }
  return _index
}
```

### Configuración del Índice (crear una vez en Pinecone Console)

```
Nombre:     dreamland-atc
Dimensiones: 1536              (text-embedding-3-small)
Métrica:    cosine
Tipo:       serverless
Cloud:      AWS
Region:     us-east-1 (o el más cercano)
```

### Operaciones Pinecone v7

> **Importante**: La API de Pinecone v7 cambió. Usar siempre estos patrones:

```typescript
// ✅ Correcto — Pinecone v7
await index.upsert({ records: [{ id, values, metadata }] })
await index.deleteMany({ ids: ["id1", "id2"] })
await index.deleteMany({ filter: { source: { $eq: "gstock" } } })

// ❌ Incorrecto — API antigua
await index.upsert([{ id, values, metadata }])  // Array directo
await index.delete1({ ids: [...] })
```

El cast de metadata requiere double cast:
```typescript
metadata as unknown as Record<string, string | number | boolean | string[]>
```

---

## 🎭 Frontend — Chat UI

El chat usa **Vercel AI SDK v6** con patrones específicos:

```typescript
// src/modules/atc/ui/chat.tsx (patrón)
import { useChat, DefaultChatTransport } from "ai"

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/atc/chat",
    body: { categoryId },
    fetch: customFetch,  // Para capturar headers de respuesta
  }),
})

// Enviar mensaje
sendMessage({ text: input }, { body: { categoryId } })

// Estado de carga
const isLoading = status === "submitted" || status === "streaming"

// Extraer texto de UIMessage.parts
const text = message.parts
  .filter(p => p.type === "text")
  .map(p => p.text)
  .join("")
```

### Renderizado de Markdown

Las respuestas del LLM se renderizan con `react-markdown` + `remark-gfm` para soporte completo de listas, negritas y tablas.

---

## 📈 Métricas y Diagnóstico

### Score de Confianza

El `confidenceScore` guardado en `Query` permite analizar la calidad del RAG:

| Score | Interpretación |
|-------|---------------|
| 0.0 | Sin resultados en KB |
| 0.55 – 0.64 | Resultado HyDE (baja confianza) |
| 0.65 – 0.79 | Resultado directo (confianza media) |
| 0.80+ | Alta confianza — contenido muy relevante |

### Indicadores de Problemas

- Score sistemáticamente < 0.55 → La KB necesita más contenido sobre ese tema
- HyDE activándose frecuentemente → Las queries de usuarios no coinciden semánticamente con el contenido indexado (revisar redacción de chunks)
- Muchas queries con `status: "OPEN"` → Contenido no cubierto en KB

---

## 🔧 Variables de Entorno

```bash
# Modelos (vía OpenRouter)
OPENROUTER_API_KEY=sk-or-...
AI_CHAT_MODEL=openai/gpt-4o-mini        # LLM principal para chat y normalización
# HyDE usa HYDE_MODEL: google/gemini-2.0-flash-lite-001 (hardcoded en embeddings.ts)

# Pinecone
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=dreamland-atc
```

---

## 🧪 Testing

El pipeline RAG tiene una suite completa de tests en `src/__tests__/atc/`:

| Archivo | Tests | Cubre |
|---------|-------|-------|
| `rag.test.ts` | 30 | Embeddings, HyDE, Pinecone ops, `searchSimilar()` |
| `rag-chat-tools.test.ts` | 24 | Tools del agente: `searchKnowledgeBase`, `lookupReservation`, `getActiveIncidents` |
| `rag-chat-tracing.test.ts` | 5 | Trazabilidad Query + QueryResolution vía `onFinish` |
| `rag-integration.test.ts` | 7 | Flujos de integración end-to-end con mocks de OpenAI + Pinecone |
| `knowledge-base-actions.test.ts` | 18 | CRUD KB, sync por fuente, bulk import con deduplicación |

```bash
npm run test:run                # Suite completa de unit tests (incluye ATC)
npm run test:e2e:rag           # Tests E2E contra APIs reales (requiere seed + ~5s espera)
```

Ver guía completa de testing: [Guía de Testing](/guides/testing)
