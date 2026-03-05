/**
 * Script one-time para extraer el perfil de tono de las conversaciones sincronizadas.
 * Ejecutar con: npx tsx scripts/extract-tone-profile.ts
 */

import "dotenv/config"

async function main() {
  // Dynamic import to avoid module resolution issues
  const { extractToneFromEmails } = await import("../src/modules/atc/domain/draft-generator")

  console.log("[extract-tone] Iniciando extraccion de perfil de tono...")
  const result = await extractToneFromEmails()
  console.log(`[extract-tone] Perfil creado/actualizado: ${result.profileId}`)
  console.log(`[extract-tone] Ejemplos few-shot: ${result.examplesCount}`)
  console.log("[extract-tone] Completado.")
  process.exit(0)
}

main().catch((err) => {
  console.error("[extract-tone] Error:", err)
  process.exit(1)
})
