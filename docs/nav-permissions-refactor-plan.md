# Plan: Navegación Dinámica Basada en Permisos

**Fecha**: 2026-02-13
**Estado**: Pendiente de implementación
**Principio rector**: *La URL refleja qué es la feature, no quién puede acceder. El control de acceso es trabajo del sistema de permisos.*

---

## 1. Diagnóstico del problema actual

### Síntoma
Al navegar a `/admin/departments` o `/admin/sentiment` desde el menú principal, el sidebar cambia a "modo admin" porque el código evalúa `pathname.startsWith('/admin')` para decidir qué menú mostrar.

### Causa raíz — dos problemas en uno

**Problema A: URLs mal asignadas**
`departments` y `sentiment` son **features de negocio**, no configuración del sistema. Sin embargo, sus rutas viven bajo `/admin`, que es un namespace reservado para administración del sistema (usuarios, roles, seed).

**Problema B: Menú controlado por URL en lugar de permisos**
El sidebar decide qué mostrar mirando la URL (`isAdminSection`). La consecuencia es un menú que cambia de contexto según dónde estés, en lugar de reflejar de forma estable lo que el usuario puede hacer.

### Bug adicional descubierto
El rol `PEOPLE_LEAD` tiene permisos completos (`manage`) sobre `sentiment` y `departments` en la base de datos, pero el guard del layout de admin (`src/app/[locale]/(modules)/admin/layout.tsx`) solo permite `["SUPER_ADMIN", "ADMIN", "STRATEGIC_PM"]`. Resultado: **PEOPLE_LEAD no puede acceder a las páginas que le corresponden**. Este refactor lo corrige también.

---

## 2. Estado actual de roles y permisos (referencia)

| Rol | projects | tasks | users | sentiment | departments | admin (sistema) |
|---|---|---|---|---|---|---|
| SUPER_ADMIN | manage | manage | manage | manage | manage | manage |
| STRATEGIC_PM | manage | manage | — | view | view | view |
| TEAM_LEAD | view | manage | — | view | view | view |
| TEAM_MEMBER | view | view+edit | — | view | view | view |
| PEOPLE_LEAD | view | view | — | **manage** | **manage** | view |
| STAKEHOLDER | view | view | — | view | view | view |

> `manage` implica todas las acciones (view, create, edit, delete).

---

## 3. Arquitectura objetivo

### 3.1 Estructura de rutas

```
/(modules)/
  departments/
    page.tsx                  ← NUEVO (movido de /admin/departments)

  sentiment/
    page.tsx                  ← NUEVO (movido de /admin/sentiment)
    new/page.tsx              ← NUEVO (movido de /admin/sentiment/new)
    [id]/edit/page.tsx        ← NUEVO (movido de /admin/sentiment/[id]/edit)
    history/page.tsx          ← NUEVO (movido de /admin/sentiment/history)

  admin/
    layout.tsx                ← MODIFICADO: solo SUPER_ADMIN
    users/page.tsx            ← SIN CAMBIOS
    roles/page.tsx            ← SIN CAMBIOS
    seed/page.tsx             ← SIN CAMBIOS
    ← SE ELIMINAN: departments/ y sentiment/ de aquí
```

### 3.2 Menú objetivo por rol

El sidebar siempre muestra el mismo menú. Los ítems visibles dependen de los permisos del usuario.

```
TODOS los usuarios autenticados:
  • Inteligencia (/) .............. always visible

Con view:projects:
  • Proyectos (/projects)

Con view:projects (Sherlock es vista de proyectos):
  • Sherlock (/sherlock)

Con view:projects (Reports está ligado a proyectos):
  • Informes (/reports)

Con view:departments:
  • Departamentos (/departments)

Con view:sentiment:
  • Pulso del Equipo (/sentiment)

Con view:admin (sección de sistema):
  • Admin (/admin)  ← al pie, como enlace secundario
```

Resultado por rol:

| Ítem | SUPER_ADMIN | STRATEGIC_PM | TEAM_LEAD | TEAM_MEMBER | PEOPLE_LEAD | STAKEHOLDER |
|---|---|---|---|---|---|---|
| Inteligencia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Proyectos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sherlock | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Informes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Departamentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pulso del Equipo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | — | — | — | — | — |

> Nota: STAKEHOLDER y TEAM_MEMBER ven esos ítems pero solo pueden leer. Las acciones de crear/editar/eliminar dentro de cada página se controlan también por permisos.

---

## 4. Cambios a implementar — paso a paso

### PASO 1 — Mover módulos de rutas

**Crear** `src/app/[locale]/(modules)/departments/`:
- `page.tsx` → copia/adapta desde `(modules)/admin/departments/page.tsx`
- Guard: `requirePermission('departments', 'view')`

**Crear** `src/app/[locale]/(modules)/sentiment/`:
- `page.tsx` → copia/adapta desde `(modules)/admin/sentiment/page.tsx`
- `new/page.tsx` → desde `(modules)/admin/sentiment/new/page.tsx`
- `[id]/edit/page.tsx` → desde `(modules)/admin/sentiment/[id]/edit/page.tsx`
- `history/page.tsx` → desde `(modules)/admin/sentiment/history/page.tsx`
- Guard en layout: `requirePermission('sentiment', 'view')`

**Mover lógica de módulos** si está en `src/modules/admin/`:
- `src/modules/admin/ui/departments/` → `src/modules/departments/ui/`
- `src/modules/admin/ui/sentiment/` → `src/modules/sentiment/ui/`
- `src/modules/admin/actions/departments.ts` → `src/modules/departments/actions/`
- `src/modules/admin/actions/sentiment.ts` → `src/modules/sentiment/actions/`

**Eliminar** después de validar:
- `src/app/[locale]/(modules)/admin/departments/`
- `src/app/[locale]/(modules)/admin/sentiment/`

---

### PASO 2 — Limpiar el admin layout

**Archivo**: `src/app/[locale]/(modules)/admin/layout.tsx`

Cambio: restringir a `SUPER_ADMIN` únicamente (o con permisos `manage:admin`).

```typescript
// ANTES (rol whitelist hardcodeada):
const allowedRoles = ["SUPER_ADMIN", "ADMIN", "STRATEGIC_PM"]

// DESPUÉS (basado en permisos):
const { authorized } = await requirePermission('admin', 'manage')
if (!authorized) redirect('/')
```

Esto tiene dos efectos:
1. Solo SUPER_ADMIN accede a `/admin`
2. La sección admin queda reservada exclusivamente para gestión del sistema

---

### PASO 3 — Refactorizar el sidebar

**Archivo**: `src/components/layout/sidebar.tsx`

Eliminar:
- `isAdminSection` y toda la lógica de toggle
- `appNavItems` y `adminNavItems` como arrays separados
- El enlace "Volver a la App"
- La condición en el footer de Admin

Reemplazar con:

```typescript
// Definición única de todos los nav items con su permiso requerido
const allNavItems = [
  {
    href: "/",
    label: t("dashboard"),
    icon: LayoutDashboard,
    permission: null  // siempre visible
  },
  {
    href: "/projects",
    label: t("projects"),
    icon: FolderKanban,
    permission: { action: "view", resource: "projects" }
  },
  {
    href: "/sherlock",
    label: "Sherlock",
    icon: Shield,
    permission: { action: "view", resource: "projects" }
  },
  {
    href: "/reports",
    label: t("reports"),
    icon: FileText,
    permission: { action: "view", resource: "projects" }
  },
  {
    href: "/departments",
    label: t("departments"),
    icon: Building2,  // ← cambiar icono de Zap a Building2 (más semántico)
    permission: { action: "view", resource: "departments" }
  },
  {
    href: "/sentiment",
    label: t("teamPulse"),
    icon: Heart,
    permission: { action: "view", resource: "sentiment" }
  },
]

// Ítem de admin separado (al pie)
const adminItem = {
  href: "/admin",
  label: t("admin"),
  icon: Settings,
  permission: { action: "manage", resource: "admin" }
}

// Filtrar según permisos del usuario (recibidos en la prop `user`)
const visibleNavItems = allNavItems.filter(item =>
  item.permission === null || hasPermission(user, item.permission.action, item.permission.resource)
)

const canSeeAdmin = hasPermission(user, "manage", "admin")
```

El sidebar ya recibe `user` con `permissions: string[]` desde el layout, así que no hace falta llamada extra.

---

### PASO 4 — Crear layouts de ruta para departments y sentiment

**`src/app/[locale]/(modules)/departments/layout.tsx`**:
```typescript
// Server component — protección basada en permiso
const { user } = await requirePermission('departments', 'view')
// render children
```

**`src/app/[locale]/(modules)/sentiment/layout.tsx`**:
```typescript
const { user } = await requirePermission('sentiment', 'view')
// render children
```

---

### PASO 5 — Actualizar i18n y links internos

Buscar y reemplazar en todos los archivos:
- `/admin/departments` → `/departments`
- `/admin/sentiment` → `/sentiment`
- `/admin/sentiment/new` → `/sentiment/new`
- `/admin/sentiment/history` → `/sentiment/history`

Archivos probablemente afectados:
- `src/components/layout/sidebar.tsx`
- `src/lib/ai/executor.ts` (el AI executor puede tener links hardcodeados)
- Cualquier `href` o `router.push` que apunte a esas rutas
- Mensajes i18n si hay URLs en los mensajes

---

### PASO 6 — Verificación de acceso en server actions

Las server actions en `src/modules/admin/actions/departments.ts` y `src/modules/admin/actions/sentiment.ts` ya deben tener `requirePermission` internamente. Verificar que el check sea el correcto:

```typescript
// departments actions — verificar que usen:
await requirePermission('departments', 'create')  // para create
await requirePermission('departments', 'edit')    // para update
await requirePermission('departments', 'delete')  // para delete
// (no cambiar 'manage:admin', que era incorrecto)

// sentiment actions — verificar que usen:
await requirePermission('sentiment', 'create')
await requirePermission('sentiment', 'edit')
await requirePermission('sentiment', 'delete')
```

---

## 5. Módulos nuevos a crear en src/modules/

```
src/modules/
  departments/
    actions/
      departments.ts       ← mover desde modules/admin/actions/departments.ts
    ui/
      department-cards.tsx ← mover desde modules/admin/ui/departments/
      department-form.tsx
      department-filters.tsx

  sentiment/
    actions/
      sentiment.ts         ← mover desde modules/admin/actions/sentiment.ts
    ui/
      sentiment-check-in-form.tsx  ← mover desde modules/admin/ui/sentiment/
      sentiment-zone-selector.tsx
      (resto de componentes)
```

---

## 6. Orden de implementación recomendado

El orden importa para no romper la app en ningún momento:

```
1. Crear rutas nuevas /departments y /sentiment (con páginas funcionales)
   → La app funciona en ambas rutas a la vez

2. Actualizar el sidebar (eliminar isAdminSection, menú dinámico por permisos)
   → El menú apunta a las rutas nuevas

3. Eliminar /admin/departments y /admin/sentiment
   → Ya no hay referencias activas

4. Limpiar admin layout (solo SUPER_ADMIN)

5. Mover módulos en src/modules/ (reorganización interna, no afecta rutas)

6. Actualizar server actions si es necesario
```

---

## 7. Archivos afectados (resumen)

| Archivo | Acción |
|---|---|
| `src/components/layout/sidebar.tsx` | Refactorizar completo (menú dinámico) |
| `src/app/[locale]/(modules)/admin/layout.tsx` | Cambiar guard a `manage:admin` |
| `src/app/[locale]/(modules)/admin/departments/` | Eliminar |
| `src/app/[locale]/(modules)/admin/sentiment/` | Eliminar |
| `src/app/[locale]/(modules)/departments/` | Crear nuevo |
| `src/app/[locale]/(modules)/sentiment/` | Crear nuevo |
| `src/modules/departments/` | Crear nuevo |
| `src/modules/sentiment/` | Crear nuevo |
| `src/modules/admin/actions/departments.ts` | Mover a `src/modules/departments/actions/` |
| `src/modules/admin/actions/sentiment.ts` | Mover a `src/modules/sentiment/actions/` |
| `src/modules/admin/ui/departments/` | Mover a `src/modules/departments/ui/` |
| `src/modules/admin/ui/sentiment/` | Mover a `src/modules/sentiment/ui/` |
| `src/lib/ai/executor.ts` | Actualizar URLs hardcodeadas |

---

## 8. Qué NO cambia

- El modelo de permisos en la base de datos (no tocar seed ni schema)
- Los server actions de projects, tasks, reports, chat (sin afectación)
- La estructura de `/admin/users`, `/admin/roles`, `/admin/seed`
- El sistema de autenticación y sesiones
- Los componentes de UI de shadcn
- Las rutas de proyectos y dashboard

---

## 9. Resultado final esperado

- **Un solo menú** que nunca cambia de contexto
- **Ítems visibles** solo para quien tiene permiso (basado en `permissions[]` de la sesión)
- **URLs semánticas**: `/departments` es departments, `/admin` es administración del sistema
- **PEOPLE_LEAD** puede acceder a Departamentos y Pulso del Equipo (bug corregido)
- **SUPER_ADMIN** es el único que ve el enlace Admin (gestión de usuarios/roles)
- **Consistencia total**: no más doble sidebar ni "Volver a la App"
