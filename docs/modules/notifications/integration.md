---
title: Integración y Extensión
description: Puntos de generación de notificaciones, cómo añadir nuevos tipos y configuración del cron de limpieza
---

# Integración y Extensión de Notificaciones

Este documento cubre dónde y cómo se generan las notificaciones en el proyecto, cómo añadir nuevas fuentes de notificación, y cómo gestionar el mantenimiento automático.

---

## 🗺️ Puntos de Generación

El sistema genera notificaciones en **7 puntos del código** distribuidos entre los módulos ATC y Projects, más un cron externo.

### Módulo ATC

| Evento | Función | Tipo | Destinatarios | Archivo |
|--------|---------|------|---------------|---------|
| Nueva incidencia | `createIncident()` | `INCIDENT_CREATED` | Broadcast `read:atc` | `src/modules/atc/actions/operations.ts` |
| Incidencia HIGH/CRITICAL | `createIncident()` | `INCIDENT_SEVERITY_HIGH` | Broadcast `read:atc` | `src/modules/atc/actions/operations.ts` |
| Nueva alerta meteorológica (manual) | `createWeatherAlert()` | `WEATHER_ALERT` | Broadcast `read:atc` | `src/modules/atc/actions/operations.ts` |
| Email asignado a usuario | `assignEmail()` | `EMAIL_ASSIGNED` | Usuario específico (assigneeId) | `src/modules/atc/actions/backoffice.ts` |
| Consulta escalada | `escalateQuery()` | `QUERY_ESCALATED` | Broadcast `manage:atc` | `src/modules/atc/actions/queries.ts` |

> Para las incidencias, se generan **hasta 2 notificaciones**: siempre `INCIDENT_CREATED`, y adicionalmente `INCIDENT_SEVERITY_HIGH` si la severidad es `HIGH` o `CRITICAL`.

### Módulo Projects

| Evento | Función | Tipo | Destinatarios | Archivo |
|--------|---------|------|---------------|---------|
| Tarea asignada al crear | `createTask()` | `TASK_ASSIGNED` | Usuario específico (assigneeId) | `src/modules/projects/actions/tasks.ts` |
| Tarea reasignada al editar | `updateTask()` | `TASK_ASSIGNED` | Nuevo assignee | `src/modules/projects/actions/tasks.ts` |
| Comentario en tarea asignada | `createComment()` | `TASK_COMMENTED` | Assignee de la tarea | `src/modules/projects/actions/task-comments.ts` |
| @mención en comentario | `createComment()` | `TASK_COMMENTED` | Usuarios mencionados | `src/modules/projects/actions/task-comments.ts` |
| Miembro añadido a proyecto | `addProjectMember()` | `PROJECT_MEMBER_ADDED` | Usuario añadido | `src/modules/projects/actions/members.ts` |

### Cron Meteorológico

| Evento | Endpoint | Tipo | Destinatarios |
|--------|---------|------|---------------|
| Alertas automáticas AEMET/OWM | `POST /api/atc/weather/check` | `WEATHER_ALERT` | Broadcast `read:atc` |

El cron genera notificaciones in-app **además** de los mensajes a Slack y Email cuando `totalAlertsCreated > 0`.

---

## 🔧 API del Servicio de Notificaciones

**Ruta:** `src/lib/notification-service.ts`

El servicio es una utilidad de servidor **pura** (sin `"use server"`), importable desde cualquier server action. Las funciones fallan silenciosamente con `console.error` para que las notificaciones **nunca bloqueen la operación principal**.

### `createNotification(input)`

Crea una notificación para un usuario específico.

```typescript
import { createNotification } from "@/lib/notification-service"

await createNotification({
  userId: "user_abc123",          // ID del destinatario
  type: "TASK_ASSIGNED",          // NotificationType
  title: `Tarea asignada: ${task.title}`,
  body: `Te han asignado la tarea en el proyecto "${project.title}"`,
  href: `/projects/${project.id}`, // Ruta de navegación (opcional)
  metadata: { taskId: task.id },   // Datos extra en JSON (opcional)
})
```

### `createNotificationsForPermission(resource, action, input)`

Crea notificaciones para **todos los usuarios** que tienen un permiso dado. Usa `prisma.notification.createMany` con `skipDuplicates: true`.

```typescript
import { createNotificationsForPermission } from "@/lib/notification-service"

await createNotificationsForPermission("atc", "read", {
  type: "INCIDENT_SEVERITY_HIGH",
  title: "Incidencia crítica: COMPLAINT",
  body: "Se ha registrado una incidencia con severidad CRITICAL",
  href: "/atc/operations",
})
```

> El parámetro `action` también incluye usuarios con acción `"manage"` sobre el mismo recurso (el query filtra `action IN [action, "manage"]`), de forma que los gestores siempre reciben los broadcasts de los visores.

---

## @Menciones en Comentarios

El parsing de menciones se implementa en `createComment()` (`src/modules/projects/actions/task-comments.ts`):

```typescript
// Extrae usernames del texto del comentario
const mentions = content.match(/@(\w+)/g)?.map(m => m.slice(1)) || []

if (mentions.length > 0) {
  const mentionedUsers = await prisma.user.findMany({
    where: { username: { in: mentions } },
    select: { id: true },
  })
  for (const u of mentionedUsers) {
    // Evita duplicar si el mencionado es también el assignee
    if (u.id !== authorId && u.id !== task.assigneeId) {
      await createNotification({ userId: u.id, type: "TASK_COMMENTED", ... })
    }
  }
}
```

**Comportamiento:**
- El regex `/@(\w+)/g` extrae todas las menciones del texto
- Se buscan los usuarios por `username` en base de datos
- Se deduplicad: si el mencionado ya es el assignee (que ya recibe notificación por ese hilo), no se genera duplicado
- El autor del comentario nunca se notifica a sí mismo (`u.id !== authorId`)
- **No hay autocompletado** en el input de comentarios — el usuario escribe `@username` manualmente

---

## ➕ Cómo Añadir un Nuevo Tipo de Notificación

Sigue estos pasos para añadir una nueva fuente de notificaciones:

### 1. Añadir el valor al enum (si necesario)

Edita `prisma/schema.prisma` y añade el nuevo valor al enum `NotificationType`:

```prisma
enum NotificationType {
  // ... valores existentes
  MI_NUEVO_TIPO
}
```

Luego ejecuta la migración:

```bash
npx prisma migrate dev --name add_notification_type
```

### 2. Añadir icono y color en NotificationItem

Edita `src/modules/notifications/ui/notification-item.tsx`:

```typescript
import { MiIcono } from "lucide-react"

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  // ... tipos existentes
  MI_NUEVO_TIPO: MiIcono,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  // ... tipos existentes
  MI_NUEVO_TIPO: "text-emerald-500",
}
```

### 3. Llamar al servicio desde la server action

En la server action correspondiente, importar y llamar **después** de la operación principal de Prisma y **antes** del `return`:

```typescript
import { createNotification } from "@/lib/notification-service"
// o
import { createNotificationsForPermission } from "@/lib/notification-service"

// Dentro de la server action, tras el await prisma.*:
await createNotification({
  userId: destinatarioId,
  type: "MI_NUEVO_TIPO",
  title: "Título de la notificación",
  body: "Descripción breve del evento",
  href: "/ruta/opcional",
})
```

> Las funciones del servicio nunca lanzan excepciones al exterior — es seguro llamarlas sin try/catch adicional.

### 4. (Opcional) Añadir claves i18n

Si el contenido de las notificaciones debe mostrarse en el idioma del usuario, construye los textos `title` y `body` usando `getTranslations()` dentro de la server action antes de llamar al servicio.

---

## 🕐 Cron de Limpieza

### Endpoint

```
GET /api/cron/cleanup-notifications
Headers:
  Authorization: Bearer <CRON_SECRET>
```

**Ruta:** `src/app/api/cron/cleanup-notifications/route.ts`

### Comportamiento

- Elimina todas las notificaciones con `createdAt < NOW() - 30 días`
- Responde con el número de registros eliminados y la fecha de corte
- Si `CRON_SECRET` no está configurado o el header no coincide, devuelve `401 Unauthorized`

### Respuesta exitosa

```json
{
  "success": true,
  "deleted": 42,
  "cutoffDate": "2026-01-23T10:00:00.000Z"
}
```

### Configuración en n8n

Crear un nodo **HTTP Request** con trigger periódico (sugerido: diario a las 03:00):

```
Method: GET
URL: https://tu-dominio.com/api/cron/cleanup-notifications
Headers:
  Authorization: Bearer {{ $env.CRON_SECRET }}
```

### Configuración en Vercel Cron

En `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-notifications",
      "schedule": "0 3 * * *"
    }
  ]
}
```

La variable `CRON_SECRET` debe estar configurada en las variables de entorno de producción. El endpoint valida el header `Authorization: Bearer <secret>`.

---

## 🔍 Troubleshooting

### Las notificaciones no aparecen tras crear una incidencia

1. Verificar que el cliente Prisma está regenerado: `npx prisma generate`
2. Revisar los logs del servidor — el servicio imprime `[notification-service] X usuario(s) encontrado(s)` y `X notificación(es) creada(s)`
3. Verificar que el usuario tiene el permiso `read:atc` en base de datos
4. Comprobar que `SUPER_ADMIN` tiene todos los permisos conectados en el seed

### El badge de notificaciones no se actualiza

El polling es de 60 segundos. Para refrescar inmediatamente: cerrar y volver a abrir el Popover (el `handleOpenChange` hace `fetchNotifications()` al abrir).

### Error "requireAuth is not defined"

Asegurarse de importar `requireAuth` desde `@/lib/actions/rbac` en el archivo de server actions, no desde `@/lib/auth`.

---

**Última actualización**: 2026-02-22
