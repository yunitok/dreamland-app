/**
 * Censo de clientes únicos de CoverManager
 *
 * Descarga todos los clientes paginados, deduplica por email y phone,
 * y genera un JSON con el resultado.
 *
 * Uso: npx tsx scripts/covermanager-client-census.ts
 *
 * Respeta COVERMANAGER_RATE_RPM (default 50 req/min) vía el throttle interno.
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { writeFileSync } from 'fs'
import { getClients } from '../src/lib/covermanager'

interface RawClient {
  id_client: string
  first_name: string
  last_name: string
  int_call_code: string
  phone: string
  email: string
  language: string
  date_upd: string | null
  user_birth: string | null
  subscribe_newsletter: string
  country: string
  tag: string[]
  membership_number: string
}

// Solo Bali tiene clientes accesibles con la API key actual
const RESTAURANT_SLUG = 'restaurante-voltereta-bali'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizePhone(phone: string, intCode: string): string {
  // Quitar espacios, guiones, paréntesis
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (!cleaned) return ''
  // Prefijo con código internacional
  const code = intCode.replace(/\+/g, '').trim()
  return `+${code}${cleaned}`
}

async function main() {
  const startTime = Date.now()
  console.log(`[censo] Iniciando descarga de clientes de "${RESTAURANT_SLUG}"...`)
  console.log(`[censo] Rate limit: ${process.env.COVERMANAGER_RATE_RPM ?? 50} RPM`)

  const allClients: RawClient[] = []
  let page = 1

  while (true) {
    const res = await getClients(RESTAURANT_SLUG, page) as { resp: number; clients: RawClient[] }
    const count = res.clients?.length ?? 0

    if (count === 0) break

    allClients.push(...res.clients)

    if (page % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      console.log(`[censo]   página ${page} → ${allClients.length} clientes acumulados (${elapsed}s)`)
    }

    page++
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`[censo] Descarga completa: ${allClients.length} registros en ${page - 1} páginas (${elapsed}s)`)

  // ─── Deduplicación ──────────────────────────────────────────────
  // Estrategia: deduplicamos por email (normalizado). Si no tiene email,
  // usamos phone normalizado. Si no tiene ninguno, mantenemos por id_client.

  const byEmail = new Map<string, RawClient>()
  const byPhone = new Map<string, RawClient>()
  const byId = new Map<string, RawClient>()
  let noContactInfo = 0

  for (const c of allClients) {
    const email = normalizeEmail(c.email)
    const phone = normalizePhone(c.phone, c.int_call_code)

    if (email) {
      // Quedarnos con el registro más reciente por email
      const existing = byEmail.get(email)
      if (!existing || (c.date_upd && (!existing.date_upd || c.date_upd > existing.date_upd))) {
        byEmail.set(email, c)
      }
    } else if (phone) {
      const existing = byPhone.get(phone)
      if (!existing || (c.date_upd && (!existing.date_upd || c.date_upd > existing.date_upd))) {
        byPhone.set(phone, c)
      }
    } else {
      byId.set(c.id_client, c)
      noContactInfo++
    }
  }

  // Merge: los de byPhone podrían ya estar en byEmail si comparten email en otro registro
  // Pero como ya filtramos (solo van a byPhone si NO tienen email), son disjuntos.
  const uniqueClients = [...byEmail.values(), ...byPhone.values(), ...byId.values()]

  // Estadísticas adicionales
  const withEmail = byEmail.size
  const withPhoneOnly = byPhone.size
  const withNothing = byId.size

  const stats = {
    restaurant: RESTAURANT_SLUG,
    fetchedAt: new Date().toISOString(),
    totalRaw: allClients.length,
    totalUnique: uniqueClients.length,
    duplicatesRemoved: allClients.length - uniqueClients.length,
    breakdown: {
      uniqueByEmail: withEmail,
      uniqueByPhoneOnly: withPhoneOnly,
      noContactInfo: withNothing,
    },
    pagesScanned: page - 1,
    elapsedSeconds: parseInt(elapsed),
  }

  console.log(`\n[censo] ═══ RESULTADOS ═══`)
  console.log(`[censo]   Total registros brutos:    ${stats.totalRaw.toLocaleString('es-ES')}`)
  console.log(`[censo]   Total clientes únicos:     ${stats.totalUnique.toLocaleString('es-ES')}`)
  console.log(`[censo]   Duplicados eliminados:     ${stats.duplicatesRemoved.toLocaleString('es-ES')}`)
  console.log(`[censo]   ─────────────────────────`)
  console.log(`[censo]   Únicos por email:          ${withEmail.toLocaleString('es-ES')}`)
  console.log(`[censo]   Únicos por teléfono (sin email): ${withPhoneOnly.toLocaleString('es-ES')}`)
  console.log(`[censo]   Sin datos de contacto:     ${withNothing.toLocaleString('es-ES')}`)
  console.log(`[censo]   Tiempo total:              ${elapsed}s`)

  // Guardar resultados
  const outputDir = 'data'
  const statsPath = `${outputDir}/covermanager-client-census-stats.json`
  const clientsPath = `${outputDir}/covermanager-client-census.json`

  // Crear directorio si no existe
  const { mkdirSync } = await import('fs')
  mkdirSync(outputDir, { recursive: true })

  writeFileSync(statsPath, JSON.stringify(stats, null, 2))
  console.log(`\n[censo] Stats guardadas en: ${statsPath}`)

  // Guardar clientes únicos (sin datos sensibles excesivos, solo resumen)
  const clientSummaries = uniqueClients.map(c => ({
    id_client: c.id_client,
    first_name: (c.first_name ?? '').trim(),
    last_name: (c.last_name ?? '').trim(),
    email: c.email ?? '',
    phone: c.phone ? `+${c.int_call_code}${c.phone}` : '',
    country: c.country ?? '',
    language: c.language ?? '',
    date_upd: c.date_upd,
    tags: c.tag ?? [],
  }))

  writeFileSync(clientsPath, JSON.stringify(clientSummaries, null, 2))
  console.log(`[censo] Listado completo guardado en: ${clientsPath}`)
}

main().catch(e => {
  console.error('[censo] Error fatal:', e.message)
  process.exit(1)
})
