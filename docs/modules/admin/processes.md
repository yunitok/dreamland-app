---
title: Procesos Automáticos
description: Framework de procesos automáticos con tracking, ejecución interna/externa y automatización por cron
---

# Procesos Automáticos

## Resumen

El sistema de procesos automáticos permite ejecutar, monitorizar y programar tareas recurrentes (sincronización, limpieza, alertas) desde una UI centralizada en `/admin/processes`. Cada ejecución queda registrada en base de datos con su estado, duración, output y errores, proporcionando trazabilidad completa.

---

## Arquitectura

El framework se compone de cuatro piezas principales:

```
┌────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Process        │     │  withProcess      │     │  ProcessRun    │
│  Registry       │────▶│  Tracking()       │────▶│  (Prisma)      │
│  (definiciones) │     │  (wrapper)        │     │  (persistencia)│
└────────────────┘     └──────────────────┘     └────────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
           ┌──────────┐ ┌──────────┐ ┌──────────┐
           │ internal │ │   n8n    │ │ external │
           │ (Next.js)│ │(webhook) │ │(GitHub)  │
           └──────────┘ └──────────┘ └──────────┘
```

### Registry (`src/modules/admin/domain/process-registry.ts`)

Catálogo en código de todos los procesos disponibles. Cada `ProcessDefinition` contiene:

- **slug**: identificador único (ej. `gstock-sync`)
- **name / description**: nombre y descripción para la UI
- **category**: `sync` | `cleanup` | `alert` — agrupa en el dashboard
- **schedule**: frecuencia programada (texto descriptivo)
- **executor**: `internal` | `n8n` | `external`
- **options**: opciones configurables por el usuario al ejecutar manualmente (ej. `dryRun`, `days`)

### Executors

| Executor | Descripción | Ejemplo |
|----------|-------------|---------|
| `internal` | Se ejecuta directamente en el runtime de Next.js (server action o API route) | Limpieza notificaciones, GStock sync |
| `n8n` | Se registra como PENDING y espera callback de un workflow n8n | Workflows complejos con múltiples servicios |
| `external` | Se registra como PENDING y espera callback de GitHub Actions u otro CI | Tareas que requieren entorno fuera de Vercel |

### ProcessRun (modelo Prisma)

Persiste cada ejecución con los siguientes campos clave:

```prisma
model ProcessRun {
  id           String            @id @default(cuid())
  processSlug  String
  status       ProcessRunStatus  // PENDING, RUNNING, SUCCESS, FAILED, CANCELLED
  triggerType  ProcessTriggerType // MANUAL, CRON, WEBHOOK
  triggeredBy  String?
  startedAt    DateTime          @default(now())
  finishedAt   DateTime?
  durationMs   Int?
  output       Json?
  error        String?
  phases       Json?             // Array de resultados por fase (GStock sync)
  metadata     Json?             // Opciones pasadas al ejecutar
}
```

### `withProcessTracking()` (`src/lib/process-runner.ts`)

Wrapper que automatiza el ciclo de vida de un ProcessRun:

1. Crea un `ProcessRun` con status `RUNNING`
2. Ejecuta la función de proceso (`fn()`)
3. Actualiza el run con `SUCCESS` + output, o `FAILED` + error
4. Si falla, envía notificación automática a todos los usuarios con permiso `admin:manage`

```typescript
const { runId, result } = await withProcessTracking(
  "cleanup-notifications",
  ProcessTriggerType.MANUAL,
  userId,
  () => executeCleanup()
)
```

### `registerExternalRun()` (`src/lib/process-runner.ts`)

Registra o actualiza un ProcessRun completado externamente (callback de n8n o GitHub Actions). Si recibe `runId`, actualiza el run existente; si no, crea uno nuevo.

---

## Catálogo de Procesos Activos

| Proceso | Slug | Executor | Schedule | Duración est. | Descripción |
|---------|------|----------|----------|---------------|-------------|
| Sincronización GStock | `gstock-sync` | internal | Diario 7:00 UTC | ~8 min | 8 fases encadenadas: unidades, categorías, categorías receta, familias, proveedores, ingredientes, recetas, KB |
| Sync Knowledge Base | `kb-sync` | internal | Bajo demanda | 1-2 min | Regenera KB desde recetas e indexa en Pinecone |
| Limpieza Notificaciones | `cleanup-notifications` | internal | Diario 2:00 UTC | <30s | Elimina notificaciones con más de 30 días |
| Limpieza Logs IA | `cleanup-ai-logs` | internal | Lunes 3:00 UTC | <1 min | Elimina logs de uso IA con más de 30 días (configurable) |
| Alertas Meteorológicas | `weather-check` | internal | Diario 8:00 UTC | 2-3 min | Consulta AEMET para ubicaciones activas, evalúa umbrales, crea alertas |

---

## Flujos de Ejecución

### 1. Manual desde UI

El usuario pulsa "Ejecutar" en el dashboard de procesos:

```
UI (botón "Ejecutar")
  → triggerProcess() [server action]
    → withProcessTracking()
      → executeInternalProcess(slug, options)
    → ProcessRun actualizado (SUCCESS/FAILED)
```

Si el proceso tiene opciones configurables (ej. `dryRun`), se abre un `TriggerDialog` previo para que el usuario las ajuste antes de ejecutar.

### 2. Cron automático

Vercel Cron invoca la ruta API correspondiente según el schedule configurado en `vercel.json`:

```
Vercel Cron (schedule)
  → GET /api/cron/[slug]
    → withProcessTracking()
      → executeInternalProcess(slug)
    → ProcessRun actualizado
```

### 3. GStock sync (ejecución por fases)

La sincronización con GStock se ejecuta en **8 fases encadenadas**, cada una dentro del límite de tiempo de Vercel (60s por invocación). Las fases se auto-encadenan mediante `fetch()` + `after()`:

```
triggerProcess("gstock-sync")
  → Crea ProcessRun (RUNNING)
  → fetch POST /api/processes/gstock-sync/run-phase { phase: 0 }
    → Ejecuta fase 0 (measure-units)
    → Guarda resultado en ProcessRun.phases[]
    → after() → fetch POST .../run-phase { phase: 1, maps: {...} }
      → Ejecuta fase 1 (categories)
      → ...
      → Fase 7 (knowledge-base)
        → Finaliza ProcessRun (SUCCESS/FAILED)
```

**Fases ordenadas:**

| # | Fase | Dependencias |
|---|------|-------------|
| 0 | `measure-units` | — |
| 1 | `categories` | — |
| 2 | `recipe-categories` | — |
| 3 | `recipe-families` | — |
| 4 | `suppliers` | — |
| 5 | `ingredients` | unitMap, categoryMap |
| 6 | `recipes` | recipeCategoryMap, familyMap, ingredientMap, productUnitMap |
| 7 | `knowledge-base` | (opcional, se salta con `skipKb`) |

Los mapas de IDs (`GstockIdMap`) se serializan/deserializan entre fases para mantener la correspondencia entre IDs de GStock y los IDs locales de Prisma.

### 4. Callback externo

Un servicio externo (n8n, GitHub Actions) notifica el resultado de un proceso:

```
n8n / GitHub Actions
  → POST /api/processes/callback
    → registerExternalRun()
    → ProcessRun creado/actualizado
    → Notificación si FAILED
```

---

## Rutas API

| Ruta | Método | Autenticación | Propósito |
|------|--------|---------------|-----------|
| `/api/processes/[slug]/trigger` | POST | `CRON_SECRET` | Trigger externo para ejecutar un proceso interno |
| `/api/processes/callback` | POST | `N8N_WEBHOOK_SECRET` o `CRON_SECRET` | Callback de n8n/GitHub Actions |
| `/api/processes/gstock-sync/run-phase` | POST | `CRON_SECRET` | Ejecuta una fase individual de GStock sync |
| `/api/cron/cleanup-notifications` | GET | Vercel Cron | Cron: limpieza notificaciones (diario 2:00) |
| `/api/cron/cleanup-ai-logs` | GET | Vercel Cron | Cron: limpieza logs IA (lunes 3:00) |
| `/api/cron/gstock-sync` | GET | Vercel Cron | Cron: sincronización GStock (diario 7:00) |
| `/api/cron/weather-check` | GET | Vercel Cron | Cron: alertas meteorológicas (diario 8:00) |

---

## Configuración Vercel Cron

Los schedules se definen en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/cleanup-notifications", "schedule": "0 2 * * *" },
    { "path": "/api/cron/cleanup-ai-logs", "schedule": "0 3 * * 1" },
    { "path": "/api/cron/gstock-sync", "schedule": "0 7 * * *" },
    { "path": "/api/cron/weather-check", "schedule": "0 8 * * *" }
  ]
}
```

Todas las rutas cron requieren la variable de entorno `CRON_SECRET` para autenticación. Vercel la inyecta automáticamente en el header `Authorization: Bearer <CRON_SECRET>` al ejecutar los crons.

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/modules/admin/domain/process-registry.ts` | Catálogo de procesos con metadata y helpers |
| `src/lib/process-runner.ts` | `withProcessTracking()` y `registerExternalRun()` |
| `src/modules/admin/actions/processes.ts` | Server actions: `getProcessDashboard()`, `triggerProcess()`, `getProcessHistory()`, `cancelProcessRun()` |
| `src/app/api/processes/[slug]/trigger/route.ts` | API route: trigger externo de procesos internos |
| `src/app/api/processes/callback/route.ts` | API route: callback de n8n/GitHub Actions |
| `src/app/api/processes/gstock-sync/run-phase/route.ts` | API route: ejecución por fases de GStock sync |
| `src/app/api/cron/cleanup-notifications/route.ts` | Cron: limpieza de notificaciones |
| `src/app/api/cron/cleanup-ai-logs/route.ts` | Cron: limpieza de logs IA |
| `src/app/api/cron/gstock-sync/route.ts` | Cron: sincronización GStock |
| `src/app/api/cron/weather-check/route.ts` | Cron: alertas meteorológicas |
| `src/modules/admin/ui/processes/process-dashboard.tsx` | Dashboard principal con cards por categoría |
| `src/modules/admin/ui/processes/process-card.tsx` | Card de proceso individual con último estado |
| `src/modules/admin/ui/processes/process-detail.tsx` | Detalle de proceso con timeline de ejecuciones |
| `src/modules/admin/ui/processes/process-run-timeline.tsx` | Timeline expandible con fases por ejecución |
| `src/modules/admin/ui/processes/trigger-dialog.tsx` | Dialog para configurar opciones antes de ejecutar |
| `vercel.json` | Configuración de crons de Vercel |

---

## UI

### Dashboard (`/admin/processes`)

El dashboard agrupa los procesos por categoría:

- **Sincronización** (azul): GStock sync, KB sync
- **Limpieza** (naranja): Notificaciones, Logs IA
- **Alertas** (rojo): Alertas meteorológicas

Cada `ProcessCard` muestra:
- Nombre, icono y descripción del proceso
- Último estado de ejecución (badge de color)
- Duración de la última ejecución
- Botón "Ejecutar" (abre `TriggerDialog` si hay opciones configurables)
- Botón "Cancelar" si hay un run en progreso

El dashboard implementa **polling cada 5 segundos** (via `router.refresh()`) mientras detecta que hay procesos con status `RUNNING`, para reflejar el progreso en tiempo real.

### Detalle de proceso (`/admin/processes/[slug]`)

Muestra el historial completo de ejecuciones con:
- Timeline paginada de runs anteriores
- Cada run expandible para ver output, error y fases individuales
- Información de trigger (manual/cron/webhook) y usuario que lo disparó

---

## Notificaciones de Fallo

Cuando un proceso falla (ya sea interno o por callback externo), el sistema crea automáticamente una notificación para todos los usuarios con permiso `admin:manage`:

```typescript
await createNotificationsForPermission("admin", "manage", {
  type: "PROCESS_FAILED",
  title: `Proceso fallido: ${slug}`,
  body: `El proceso "${slug}" ha fallado después de ${seconds}s: ${errorMessage}`,
  href: `/admin/processes/${slug}`,
})
```

Esto asegura que los administradores sean informados de inmediato de cualquier fallo en los procesos automatizados.

---

## Lectura Adicional

- [Admin Module](./index)
- [RBAC](./rbac)
- [GStock Sync Pipeline](../sherlock/integrations/gstock-sync-pipeline)
- [Notificaciones](../notifications/index)
