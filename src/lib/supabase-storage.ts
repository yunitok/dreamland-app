import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
}

// Cliente admin con service_role — SOLO para server-side (storage)
// Nunca exponer al cliente
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

/**
 * Sube un archivo a un bucket de Supabase Storage.
 * @returns La ruta del archivo dentro del bucket.
 */
export async function uploadToStorage(
  bucket: string,
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return data.path
}

/**
 * Elimina un archivo de un bucket de Supabase Storage.
 * @param storagePath La ruta del archivo dentro del bucket.
 */
export async function deleteFromStorage(
  bucket: string,
  storagePath: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([storagePath])

  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}

/**
 * Obtiene la URL pública de un archivo en un bucket público.
 */
export function getPublicUrl(bucket: string, storagePath: string): string {
  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Genera una URL firmada para un archivo en un bucket privado.
 * @param expiresIn Segundos hasta que expira la URL (defecto: 1 hora).
 */
export async function getSignedUrl(
  bucket: string,
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw new Error(`Signed URL generation failed: ${error.message}`)
  return data.signedUrl
}
