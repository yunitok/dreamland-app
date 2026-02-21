---
title: Gestión de Incidencias
description: Registro, seguimiento y resolución de incidencias operativas en el módulo ATC
---

# Gestión de Incidencias

El sistema de incidencias permite al equipo de atención al cliente registrar, clasificar y resolver problemas operativos que surgen en el día a día de los restaurantes.

---

## Acceso

**Ruta:** `/atc/operations` → pestaña **Incidencias**

**Permisos requeridos:**

| Operación | Rol mínimo |
|-----------|-----------|
| Ver incidencias | `ATC_VIEWER` (read:atc) |
| Crear incidencias | `ATC_AGENT` (manage:atc) |
| Resolver incidencias | `ATC_AGENT` (manage:atc) |

---

## Tipos de Incidencia

Cada incidencia se clasifica en uno de estos tipos:

| Tipo | Clave interna | Cuándo usarlo |
|------|--------------|---------------|
| Pago | `PAYMENT` | Problemas con cobros, TPV, pagos duplicados o devoluciones |
| Meteorología | `WEATHER` | Incidencias derivadas de condiciones meteorológicas adversas |
| Queja | `COMPLAINT` | Reclamaciones de clientes sobre servicio, comida o experiencia |
| Grupo | `GROUP` | Problemas con reservas de grupo (coordinación, cambios de última hora) |
| Otro | `OTHER` | Cualquier incidencia que no encaje en las categorías anteriores |

---

## Niveles de Severidad

| Severidad | Color | Cuándo asignarla |
|-----------|-------|-----------------|
| Baja (`LOW`) | Azul | Incidencias menores sin impacto inmediato en el servicio |
| Media (`MEDIUM`) | Amarillo | Afecta parcialmente al servicio o a un cliente concreto |
| Alta (`HIGH`) | Naranja | Impacto significativo en el servicio o múltiples clientes |
| Crítica (`CRITICAL`) | Rojo | Emergencia que requiere atención inmediata (seguridad, pérdida económica importante) |

La tabla ordena automáticamente las incidencias por severidad descendente (las críticas siempre arriba).

---

## Estados y Ciclo de Vida

Una incidencia pasa por estos estados:

```
OPEN ──→ IN_PROGRESS ──→ RESOLVED ──→ CLOSED
```

| Estado | Badge | Significado |
|--------|-------|------------|
| Abierta (`OPEN`) | Amarillo | Recién creada, pendiente de asignación |
| En progreso (`IN_PROGRESS`) | Azul | Alguien la está gestionando |
| Resuelta (`RESOLVED`) | Verde | Se ha solucionado el problema |
| Cerrada (`CLOSED`) | Gris | Cerrada definitivamente |

### Transiciones disponibles desde la UI

Actualmente la tabla ofrece una única acción:

- **Resolver** — Cambia el estado a `RESOLVED` y registra la fecha de resolución (`resolvedAt`). Solo disponible si la incidencia NO está ya resuelta o cerrada.

### Limitaciones actuales

- **No hay botón para revertir** un estado. Si se marca como resuelta por error, no es posible volver a `OPEN` o `IN_PROGRESS` desde la interfaz.
- **No hay estado `IN_PROGRESS`** accesible desde la UI. La action existe en el backend (`updateIncidentStatus`) pero no tiene botón en la tabla.
- **No se puede editar** una incidencia una vez creada (ni la descripción, ni el tipo, ni la severidad).
- **No se puede eliminar** una incidencia.

> **Nota para administradores:** Si necesitas revertir un estado, actualmente la única opción es hacerlo directamente en base de datos. Se recomienda implementar estas acciones en una futura iteración.

---

## Crear una Incidencia

1. Haz clic en el botón **"Nueva incidencia"** en la cabecera de la página.
2. Rellena el formulario:

| Campo | Tipo | Obligatorio | Detalle |
|-------|------|------------|---------|
| Tipo | Selector | Si | PAYMENT, WEATHER, COMPLAINT, GROUP u OTHER |
| Severidad | Selector | Si | LOW, MEDIUM, HIGH o CRITICAL |
| Descripción | Textarea | Si | Mínimo 10 caracteres. Describe el problema con detalle |

3. Haz clic en **"Registrar"**.
4. La incidencia aparecerá en la tabla con estado `OPEN`.

---

## Resolver una Incidencia

1. En la tabla, localiza la incidencia que quieres resolver.
2. Haz clic en el icono de tres puntos (`⋯`) en la columna de acciones.
3. Selecciona **"Resolver"** (icono verde de check).
4. La incidencia pasará a estado `RESOLVED` con la fecha de resolución registrada automáticamente.

> El botón "Resolver" aparece deshabilitado (gris) si la incidencia ya está en estado `RESOLVED` o `CLOSED`.

---

## Columnas de la Tabla

| Columna | Contenido |
|---------|----------|
| Tipo | Código del tipo (PAYMENT, WEATHER, etc.) |
| Descripción | Texto truncado del detalle de la incidencia |
| Severidad | Badge con color según nivel |
| Estado | Badge con color según estado actual |
| Fecha | Fecha de creación en formato `dd/mm/aaaa` |
| Acciones | Menú desplegable con la opción de resolver |

La tabla incluye un buscador por descripción en la parte superior.

---

## Modelo de Datos

```prisma
model Incident {
  id          String           @id @default(cuid())
  type        IncidentType
  severity    IncidentSeverity @default(LOW)
  description String
  status      IncidentStatus   @default(OPEN)
  assignedTo  String?          // Reservado para futura asignación
  resolvedAt  DateTime?        // Se rellena al resolver/cerrar
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

El campo `assignedTo` está preparado para una futura funcionalidad de asignación a miembros del equipo, pero actualmente no se utiliza.

---

## Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| `src/modules/atc/actions/operations.ts` | Server actions: `getIncidents`, `createIncident`, `resolveIncident`, `updateIncidentStatus` |
| `src/modules/atc/ui/operations/incidents-table.tsx` | Tabla de incidencias con DataTable |
| `src/modules/atc/ui/operations/incident-dialog.tsx` | Dialog de creación de nueva incidencia |
| `src/modules/atc/domain/schemas.ts` | Schema Zod `incidentSchema` para validación |
| `src/app/[locale]/(modules)/atc/operations/page.tsx` | Página de operaciones (contiene las dos pestañas) |
