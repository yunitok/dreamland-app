---
title: File Storage
description: Almacenamiento de archivos con Supabase Storage — avatares de usuario y adjuntos de tareas
---

# File Storage

## Overview

Dreamland Manager usa **Supabase Storage** para persistir archivos binarios. Esto garantiza que los archivos no se pierdan entre deploys (a diferencia del filesystem local) y aprovecha la misma instancia de Supabase ya utilizada para la base de datos.

Todo el acceso al storage se realiza exclusivamente desde **server actions** usando el cliente admin (`service_role`), que bypassa las políticas RLS de Supabase.

---

## Arquitectura

```
src/lib/supabase-storage.ts    ← cliente admin + funciones de utilidad
src/app/actions/
└── profile-actions.ts         ← uploadAvatar(), deleteAvatar()
src/modules/projects/actions/
└── task-attachments.ts        ← uploadAttachment(), deleteAttachment(), getAttachments()
scripts/
└── setup-supabase-storage.sql ← setup de buckets en Supabase Dashboard
```

---

## Buckets

| Bucket | Tipo | Límite | Tipos permitidos | Uso |
|--------|------|--------|-----------------|-----|
| `avatars` | **Público** | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Fotos de perfil de usuario |
| `attachments` | **Privado** | 10 MB | Todos | Adjuntos de tareas de proyectos |

### Bucket público (`avatars`)

Las imágenes de perfil son accesibles mediante URL pública directa, sin necesidad de autenticación:

```
https://{project-ref}.supabase.co/storage/v1/object/public/avatars/{userId}.jpg
```

### Bucket privado (`attachments`)

Los adjuntos de tareas son privados. Se generan **URLs firmadas** con expiración de 1 hora cada vez que se llama a `getAttachments()`.

---

## Configuración

### Variables de entorno

```bash
# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://{project-ref}.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Project Settings > API > service_role
```

> **Importante**: `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al cliente. Solo se usa en server-side.

### Setup de buckets

Ejecutar en Supabase Dashboard → SQL Editor:

```bash
# Copiar y ejecutar el contenido de:
scripts/setup-supabase-storage.sql
```

El script crea los dos buckets con las configuraciones de límite y MIME types correctas. Es idempotente (usa `ON CONFLICT DO UPDATE`).

### Next.js Image (next.config.ts)

Para usar el componente `<Image>` de Next.js con URLs de Supabase:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
}
```

---

## API de Storage (`src/lib/supabase-storage.ts`)

```typescript
// Subir archivo
uploadToStorage(bucket, storagePath, buffer, contentType): Promise<string>

// Eliminar archivo
deleteFromStorage(bucket, storagePath): Promise<void>

// URL pública (bucket público)
getPublicUrl(bucket, storagePath): string

// URL firmada con expiración (bucket privado)
getSignedUrl(bucket, storagePath, expiresIn?: number): Promise<string>
// expiresIn por defecto: 3600 segundos (1 hora)
```

---

## Flujos

### Subir Avatar

```
1. uploadAvatar(formData) [Server Action]
2. Validar tipo MIME y tamaño (máx 5 MB)
3. storagePath = "{userId}.{extension}"
4. uploadToStorage('avatars', storagePath, buffer, mimetype)
5. imageUrl = getPublicUrl('avatars', storagePath)
6. prisma.user.update({ data: { image: imageUrl } })
7. Actualizar cookie de sesión con nueva URL
```

### Subir Adjunto de Tarea

```
1. uploadAttachment(taskId, uploaderId, file) [Server Action]
2. Validar permisos: hasProjectAccess(projectId, 'EDITOR')
3. Validar tamaño (máx 10 MB)
4. storagePath = "tasks/{taskId}/{timestamp}.{ext}"
5. uploadToStorage('attachments', storagePath, buffer, mimetype)
6. prisma.taskAttachment.create({ data: { filepath: storagePath, ... } })
   → Se guarda la RUTA del bucket, no la URL
```

### Obtener Adjuntos

```
1. getAttachments(taskId) [Server Action]
2. Validar permisos: hasProjectAccess(projectId, 'VIEWER')
3. prisma.taskAttachment.findMany(...)
4. Para cada adjunto (ruta de bucket):
   → getSignedUrl('attachments', filepath, 3600)
   → Se devuelve el adjunto con filepath = URL firmada (válida 1h)
```

---

## Retrocompatibilidad

Antes de implementar Supabase Storage, los archivos se guardaban en el filesystem local:

- Avatares: `/public/avatars/{userId}.{ext}` → almacenados como `/avatars/{userId}.{ext}` en `user.image`
- Adjuntos: `/public/uploads/attachments/...` → almacenados como `/uploads/attachments/...` en `taskAttachment.filepath`

Los registros legacy se detectan por el prefijo de la ruta:

```typescript
// En deleteAvatar():
if (user.image.startsWith('/avatars/')) {
  // Ruta legacy del filesystem — no intentar borrar de Supabase
}

// En getAttachments() / deleteAttachment():
if (attachment.filepath.startsWith('/uploads/')) {
  // Ruta legacy — devolver ruta tal cual / omitir borrado de Storage
}
```

---

## Seguridad

- El cliente `supabaseAdmin` usa `SUPABASE_SERVICE_ROLE_KEY` y **jamás se importa en Client Components**
- Toda validación de permisos se hace antes de llamar al storage (via `requirePermission` o `hasProjectAccess`)
- Las políticas RLS de Supabase no son necesarias porque el acceso es exclusivamente via `service_role`
- Las URLs firmadas de adjuntos expiran en 1 hora, minimizando el riesgo de filtración de links
