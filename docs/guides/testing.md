---
title: Guía de Testing
description: Estrategia, patrones y cobertura de tests del proyecto Dreamland Manager
---

# Guía de Testing - Dreamland Manager

## Overview

Framework: **Vitest v4**. Dos entornos de ejecución:

- **`jsdom`** — unit tests y component tests (mocks de browser API, React Testing Library)
- **`node`** (puro) — tests e2e contra APIs reales (Pinecone, OpenRouter)

---

## Comandos

```bash
npm run test           # modo watch interactivo
npm run test:run       # ejecución única (CI)
npm run test:coverage  # con reporte de cobertura v8
npm run test:e2e:rag   # tests e2e RAG contra APIs reales
```

---

## Configuración

### `vitest.config.ts` — Suite principal

- Entorno: `jsdom`
- Setup: `src/__tests__/setup.ts`
- `globals: true`
- Excluye: `rag-e2e.test.ts`
- Coverage con provider `v8`

### `vitest.e2e.config.ts` — Suite E2E

- Entorno: `node` (puro)
- Setup: `src/__tests__/e2e-setup.ts`
- Timeout: 30 segundos
- Solo incluye: `rag-e2e.test.ts`

### Variables de entorno requeridas para E2E

```bash
OPENROUTER_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=dreamland-atc   # valor por defecto
```

### Requisito previo para E2E

Cargar el seed de Knowledge Base y esperar ~5 segundos antes de lanzar los tests
(Pinecone tarda en indexar los vectores):

```bash
npx tsx prisma/seed-knowledge-base.ts
# esperar ~5s
npm run test:e2e:rag
```

---

## Estructura de Tests

```
src/__tests__/
├── setup.ts                          # setup jsdom + dotenv + jest-dom
├── e2e-setup.ts                      # setup e2e (solo dotenv)
├── setup.test.ts
├── auth.test.ts
├── permissions.test.ts
├── rate-limit.test.ts
├── schemas.test.ts
├── chat-service.test.ts
├── chat-panel.test.tsx
├── login-form.test.tsx
├── change-password-form.test.tsx
├── task-lists.test.ts
├── admin/
│   ├── identity-users.test.ts
│   └── identity-roles.test.ts
├── projects/
│   ├── tasks-actions.test.ts
│   └── projects-actions.test.ts
├── departments/
│   └── departments-actions.test.ts
├── sentiment/
│   └── sentiment-actions.test.ts
├── sherlock/
│   └── ingredients-actions.test.ts
├── lib/
│   └── weather.test.ts
└── atc/
    ├── rag.test.ts
    ├── rag-chat-tools.test.ts
    ├── rag-chat-tracing.test.ts
    ├── rag-integration.test.ts
    ├── rag-e2e.test.ts               # ← e2e, excluido del suite normal
    ├── knowledge-base-actions.test.ts
    ├── operations-actions.test.ts
    ├── reservations-actions.test.ts
    ├── queries-actions.test.ts
    └── backoffice-actions.test.ts

src/lib/ai/__tests__/
└── tool-mapping.test.ts
```

---

## Inventario por Módulo

| Módulo | Archivo | Tests | Qué cubre |
|--------|---------|------:|-----------|
| Core / Setup | `setup.test.ts` | 1 | Verificación de configuración Vitest |
| Core / Auth | `auth.test.ts` | 6 | `login()`, `updatePassword()` |
| Core / Auth | `permissions.test.ts` | 5 | `hasPermission()` (función pura) |
| Core / Auth | `rate-limit.test.ts` | 6 | `checkRateLimit()`, `checkAIRateLimit()` |
| Core / Schemas | `schemas.test.ts` | 8 | Validación Zod: cuid, task, project |
| Core / Chat | `chat-service.test.ts` | 4 | `saveMessage()`, `getHistory()` |
| Componentes | `chat-panel.test.tsx` | 4 | ChatPanel — render, apertura, historial |
| Componentes | `login-form.test.tsx` | 3 | LoginForm — remember me |
| Componentes | `change-password-form.test.tsx` | 6 | ChangePasswordForm — validación y submit |
| Projects | `task-lists.test.ts` | 5 | CRUD task lists, posición, dependencias |
| Projects | `tasks-actions.test.ts` | 40 | CRUD tasks, `moveTask()`, `updateTaskProgress()` |
| Projects | `projects-actions.test.ts` | 23 | CRUD projects, filtros, transacciones |
| Admin | `identity-users.test.ts` | 22 | CRUD usuarios, hash bcrypt, validaciones |
| Admin | `identity-roles.test.ts` | 24 | CRUD roles, permisos, guard sistema |
| Departments | `departments-actions.test.ts` | 21 | CRUD departamentos, join con projects |
| Sentiment | `sentiment-actions.test.ts` | 24 | CRUD moods, validación Zod, `getDepartments()` |
| Sherlock | `ingredients-actions.test.ts` | 19 | CRUD ingredientes, filtros de búsqueda |
| Lib | `weather.test.ts` | 19 | `evaluateThresholds()` (función pura, 4 tipos de alerta) |
| AI Tools | `tool-mapping.test.ts` | 2 | `getGeminiTools()`, `getGroqTools()` — transformación de herramientas por proveedor |
| ATC / RAG | `rag.test.ts` | 30 | Embeddings, HyDE, Pinecone ops, `searchSimilar()` |
| ATC / RAG | `rag-chat-tools.test.ts` | 24 | Tools del agente: `searchKnowledgeBase`, `lookupReservation`, etc. |
| ATC / RAG | `rag-chat-tracing.test.ts` | 5 | Trazabilidad Query + QueryResolution vía `onFinish` |
| ATC / RAG | `rag-integration.test.ts` | 7 | Flujos de integración (mocks de OpenAI + Pinecone) |
| ATC / KB | `knowledge-base-actions.test.ts` | 18 | CRUD KB, sync, bulk import, deduplicación |
| ATC / Ops | `operations-actions.test.ts` | 42 | Incidents, weather alerts, pagos, `checkWeatherNow()` |
| ATC / Reservas | `reservations-actions.test.ts` | 29 | CRUD reservas, waiting list, canales |
| ATC / Queries | `queries-actions.test.ts` | 27 | Queries, feedback, escalación, búsqueda KB |
| ATC / Backoffice | `backoffice-actions.test.ts` | 43 | Emails, clasificación, invoices, gift vouchers |
| E2E | `rag-e2e.test.ts` | 10 | Pipeline RAG contra APIs reales (OpenRouter + Pinecone) |

**Total unit tests: 457 tests en 28 archivos**

**Tests E2E: 10 tests en 1 archivo**

---

## Patrones de Mocking

Patrón estándar que se repite en casi todos los action tests:

```typescript
// Patrón estándar para server actions
vi.mock("@/lib/prisma", () => ({
  prisma: {
    model: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}))

vi.mock("@/lib/actions/rbac", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})
```

### Variaciones importantes

- El módulo **Projects** usa `hasProjectAccess` en lugar de `requirePermission`
- Los tests de **componentes React** usan `@testing-library/react` con entorno jsdom
- Para mocks que deben estar disponibles antes de `vi.mock()`, usar `vi.hoisted()`

---

## Tests E2E RAG

Archivo: `src/__tests__/atc/rag-e2e.test.ts` — **10 tests**

Estos tests requieren APIs reales y **no se incluyen en el suite normal** (`npm run test:run`).
Se ejecutan por separado con:

```bash
npm run test:e2e:rag
```

### Requisitos previos

1. `OPENROUTER_API_KEY` y `PINECONE_API_KEY` configuradas en `.env`
2. Seed cargado: `npx tsx prisma/seed-knowledge-base.ts`
3. Esperar ~5 segundos tras el seed para que Pinecone indexe los vectores

### Qué cubren

- 7 queries de búsqueda semántica con resultado esperado (score ≥ 0.55)
- 1 guardrail: consulta irrelevante devuelve 0 resultados
- 1 test HyDE: la hipótesis generada mejora el score respecto a la query directa
- 1 verificación de que el índice Pinecone tiene datos cargados
