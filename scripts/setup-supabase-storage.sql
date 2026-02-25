-- =============================================================================
-- Setup de Supabase Storage para Dreamland App
-- =============================================================================
-- Ejecutar en Supabase Dashboard > SQL Editor
-- O via: supabase db reset (si tienes la CLI configurada)
-- =============================================================================

-- Bucket público para avatares de usuarios
-- Las imágenes de perfil son accesibles públicamente sin autenticación
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,       -- Bucket público (URLs accesibles sin firma)
  5242880,    -- 5MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket privado para adjuntos de tareas
-- Los archivos requieren URL firmada para acceder
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,       -- Bucket privado (requiere URL firmada)
  10485760,    -- 10MB límite
  NULL         -- Todos los tipos de archivo permitidos
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- Nota: Las políticas RLS no son necesarias porque el acceso se realiza
-- exclusivamente via server actions con el cliente admin (service_role),
-- que bypassa RLS por diseño.
--
-- Si en el futuro se necesita acceso directo desde el cliente (browser),
-- añadir políticas aquí.
-- =============================================================================
