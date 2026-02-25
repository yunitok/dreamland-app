---
title: Authentication & User Management
description: Credential-based login with JWT sessions, session middleware, and role-based access control
---

# Authentication & User Management

## Overview

Dreamland Manager usa autenticación basada en **credenciales propias** (username/password), sesiones **JWT firmadas con HS256** almacenadas en cookies httpOnly, y un middleware de Next.js que protege todas las rutas automáticamente.

No usa NextAuth.js ni Supabase Auth — el sistema es completamente autónomo.

---

## Arquitectura del Sistema

```
src/lib/
├── session.ts          ← encrypt() / decrypt() con jose (JWT HS256)
├── auth.ts             ← login(), logout(), getSession(), updatePassword()
src/proxy.ts            ← protección de rutas + locale routing (next-intl)
src/lib/actions/
└── rbac.ts             ← requirePermission(), requireAuth() — server-side
src/lib/
└── permissions.ts      ← hasPermission() — client-side (UI only)
```

---

## Session Management

### JWT con jose

Las sesiones se codifican como JWTs firmados con HMAC-SHA256.

**Archivo**: `src/lib/session.ts`

```typescript
encrypt(payload: JWTPayload) // → JWT firmado (24h por defecto)
decrypt(input: string)       // → JWTPayload o lanza error
```

El payload incluye:
```typescript
{
  user: {
    id: string
    username: string
    name: string | null
    role: string
    permissions: string[]    // ["read:atc", "manage:projects", ...]
    mustChangePassword: boolean
  },
  expires: Date
}
```

### Cookie de Sesión

- Nombre: `session`
- Opciones: `httpOnly: true`, `secure: true` (producción), `path: '/'`
- Duración estándar: **24 horas**
- Duración con "Recordarme": **30 días**

---

## Middleware de Rutas

**Archivo**: `src/proxy.ts`

El proxy intercepta **todas las requests** (excepto `/api/`, archivos Next.js internos y assets estáticos) y gestiona:

1. **Validación de sesión JWT**: si la cookie `session` no existe o es inválida/expirada, redirige a `/{locale}/login`
2. **Cambio de contraseña forzado**: si `user.mustChangePassword` es `true`, redirige a `/{locale}/change-password`
3. **Redirección desde login**: si el usuario ya tiene sesión válida y accede a `/login`, redirige al dashboard
4. **Locale routing**: delega en `next-intl/middleware` para resolver el prefijo de idioma
5. **Redirect `/docs`**: redirige `/docs` (sin prefijo de locale) a `/es/docs`

### Rutas públicas (sin sesión requerida)

| Ruta | Descripción |
|------|-------------|
| `/[locale]/login` | Formulario de login |
| `/[locale]/change-password` | Cambio de contraseña forzado |

### Matcher

```typescript
matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'
```

---

## Flujo de Login

```
1. Usuario accede a /{locale}/login
2. Envía FormData con username, password, remember?
3. login(formData) [Server Action en src/lib/auth.ts]:
   a. prisma.user.findUnique({ where: { username } })
   b. bcryptjs.compare(password, user.password)
   c. Construye payload JWT con permisos del rol
   d. encrypt(payload) → JWT
   e. Set cookie "session" con expires según remember
4. Redirect a /{locale}/
5. Middleware valida la nueva cookie → acceso concedido
```

---

## Seguridad

### 1. Cambio de Contraseña Forzado

Los administradores pueden marcar usuarios para que cambien su contraseña al siguiente login.

- **Flag en BD**: `User.mustChangePassword: boolean`
- **Página**: `/{locale}/change-password`
- **Flujo**: `proxy.ts` detecta `user.user.mustChangePassword === true` y redirige automáticamente a `/{locale}/change-password` en cada request hasta que el usuario cambie su contraseña

### 2. "Recordarme"

| Modo | Duración |
|------|----------|
| Sin checkbox | 24 horas |
| Con "Recordarme" | 30 días |

### 3. Hashing de Contraseñas

Todas las contraseñas se almacenan con **bcryptjs** (cost factor 10).

### 4. Clave JWT

```bash
JWT_SECRET="tu-clave-secreta-aqui"  # requerido en producción
```

Si `JWT_SECRET` no está definida, se usa un fallback hardcoded (solo desarrollo).

---

## RBAC — Control de Acceso

Dos capas independientes:

### Capa 1: Client-side (`src/lib/permissions.ts`)

Solo para mostrar/ocultar elementos UI. **No autoritativa.**

```typescript
hasPermission(session.user, 'read', 'atc')     // → boolean
hasAnyPermission(session.user, ['read:atc', 'manage:atc'])
```

### Capa 2: Server-side (`src/lib/actions/rbac.ts`)

Consulta la DB en vivo. Es la fuente de verdad.

```typescript
// En server actions — siempre como primera línea:
await requirePermission('atc', 'manage')    // lanza error si denegado
await requireAuth()                          // solo verificar sesión activa
await hasProjectAccess(projectId, 'EDITOR') // acceso a proyecto específico
```

### SUPER_ADMIN

El rol `SUPER_ADMIN` bypassa **todos** los permisos automáticamente.

---

## Gestión de Usuarios

### Importación en Bloque

Script para importar usuarios desde JSON:

```bash
npx tsx scripts/import-users.ts
```

**Formato de entrada** (`data/users.json`):
```json
[
  {
    "username": "jdoe",
    "email": "jdoe@example.com",
    "name": "John Doe",
    "role": "STRATEGIC_PM"
  }
]
```

- Contraseña por defecto: `dreamland2026`
- `mustChangePassword: true` para todos los importados
- Idempotente: salta usuarios que ya existen

---

## Internacionalización

Todas las pantallas de auth están localizadas en: `es`, `en`, `de`, `fr`, `it`, `ru`

Esto incluye login, change-password y todos los mensajes de error.

Ver [Internationalization Guide](./internationalization.md) para más detalles.
