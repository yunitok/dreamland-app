---
title: Automatización con Vercel Cron
description: Guía para configurar y gestionar tareas programadas con Vercel Cron
---

# Automatización con Vercel Cron

## Resumen

La aplicación usa **Vercel Cron** para ejecutar tareas programadas automáticamente. Cada cron es una ruta API GET protegida con `CRON_SECRET`.

Las tareas programadas cubren mantenimiento (limpieza de datos antiguos), sincronización de datos externos (GStock) y monitorización (alertas meteorológicas).

---

## Cómo funciona

1. **`vercel.json`** define las rutas y schedules en formato cron estándar
2. Vercel envía un **GET** con el header `Authorization: Bearer <CRON_SECRET>` a cada ruta según su schedule
3. Cada ruta **valida el secret**, ejecuta la tarea y retorna JSON con el resultado
4. **`withProcessTracking()`** registra cada ejecución en la tabla `ProcessRun` con status, duración y output

```
vercel.json (schedule) → GET /api/cron/<slug> → withProcessTracking() → ProcessRun (DB)
```

---

## Crons configurados

| Ruta | Schedule | Descripción |
|------|----------|-------------|
| `/api/cron/cleanup-notifications` | `0 2 * * *` (diario 2:00 UTC) | Elimina notificaciones con más de 30 días |
| `/api/cron/cleanup-ai-logs` | `0 3 * * 1` (lunes 3:00 UTC) | Elimina logs de uso IA con más de 30 días |
| `/api/cron/gstock-sync` | `0 7 * * *` (diario 7:00 UTC) | Sincronización completa GStock → Sherlock → RAG |
| `/api/cron/weather-check` | `0 8 * * *` (diario 8:00 UTC) | Consulta AEMET y crea alertas meteorológicas |

---

## Patrón de implementación

Todas las rutas cron siguen el mismo patrón. Ejemplo basado en `cleanup-notifications`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withProcessTracking } from "@/lib/process-runner"
import { ProcessTriggerType } from "@prisma/client"

export async function GET(request: Request) {
  // 1. Validar el secret de Vercel Cron
  const authHeader = request.headers.get("authorization")
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // 2. Ejecutar con tracking automático
    const { result } = await withProcessTracking(
      "mi-proceso",
      ProcessTriggerType.CRON,
      "api-cron",
      async () => {
        // Lógica del proceso
        return { message: "OK" }
      }
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
```

### Puntos clave del patrón

- **Validación del secret**: siempre como primera operación, antes de cualquier lógica de negocio
- **`withProcessTracking()`**: envuelve la lógica para registrar automáticamente el estado, duración y output en `ProcessRun`
- **`ProcessTriggerType.CRON`**: identifica la ejecución como automática (vs. `MANUAL` desde la UI)
- **Respuesta JSON**: siempre retorna `{ success: true, ... }` o `{ error: "..." }` con código HTTP apropiado

---

## Cómo añadir un nuevo cron

### Paso 1: Crear la ruta API

Crear el archivo `src/app/api/cron/<slug>/route.ts` siguiendo el patrón descrito arriba.

### Paso 2: Registrar el proceso

Añadir la definición del proceso en `src/modules/admin/domain/process-registry.ts` para que aparezca en el dashboard de administración con su nombre, descripción y categoría.

### Paso 3: Configurar el schedule en `vercel.json`

Añadir la entrada en la sección `crons`:

```json
{
  "crons": [
    {
      "path": "/api/cron/mi-nuevo-proceso",
      "schedule": "0 4 * * *"
    }
  ]
}
```

### Paso 4: Configurar variables de entorno

Asegurarse de que `CRON_SECRET` está configurado en las variables de entorno del proyecto en Vercel. Si el nuevo cron requiere variables adicionales, añadirlas también.

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `CRON_SECRET` | Token secreto compartido entre Vercel y la app. Usado para validar que la petición proviene de Vercel Cron | Sí |
| `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` | URL base de la aplicación. Usado por `gstock-sync` para las llamadas internas entre fases del pipeline | Sí (para gstock-sync) |

---

## Monitorización

Todas las ejecuciones de crons quedan registradas en la tabla `ProcessRun` y son visibles desde **`/admin/processes`** en la UI de administración.

Cada registro incluye:
- **Estado**: success / error
- **Duración**: tiempo de ejecución en milisegundos
- **Output**: resultado JSON del proceso
- **Trigger**: `CRON` (automático) o `MANUAL` (lanzado desde la UI)
- **Fecha**: timestamp de inicio y fin

Los fallos generan **notificaciones automáticas** a los administradores del sistema.

---

## Archivos clave

| Archivo | Responsabilidad |
|---------|----------------|
| `vercel.json` | Configuración de schedules (rutas y expresiones cron) |
| `src/app/api/cron/` | Directorio con las rutas de todos los crons |
| `src/lib/process-runner.ts` | `withProcessTracking()` para logging automático de ejecuciones |
| `src/modules/admin/domain/process-registry.ts` | Registro de procesos para el dashboard admin |

---

## Referencias

- [Deployment Guide](./deployment.md)
- [Admin — Dashboard de Procesos](../modules/admin/index.md)
- [Pipeline de Sincronización GStock](../modules/sherlock/integrations/gstock-sync-pipeline.md)
