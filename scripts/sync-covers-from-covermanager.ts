/**
 * Sincronización de comensales desde CoverManager → BD
 *
 * Usa el endpoint stats/get_resumen_date (1 call/día/restaurante)
 * para obtener totales de comensales por servicio (comida/cena).
 *
 * Prerequisito: los RestaurantLocation deben tener cmSlug configurado.
 *
 * Ejecución:
 *   npx tsx scripts/sync-covers-from-covermanager.ts                    # Dry-run últimos 90 días
 *   npx tsx scripts/sync-covers-from-covermanager.ts --write            # Escritura últimos 90 días
 *   npx tsx scripts/sync-covers-from-covermanager.ts --write --full     # 3 años completos
 *   npx tsx scripts/sync-covers-from-covermanager.ts --write --days=30  # Últimos 30 días
 *   npx tsx scripts/sync-covers-from-covermanager.ts --seed-slugs       # Poblar cmSlug en RestaurantLocation
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// ─── Setup Prisma (standalone — no usa singleton de Next.js) ────

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2)
const write = args.includes("--write")
const full = args.includes("--full")
const seedSlugs = args.includes("--seed-slugs")
const daysArg = args.find((a) => a.startsWith("--days="))
const days = daysArg ? parseInt(daysArg.split("=")[1]) : full ? 1095 : 90

// ─── Colores ANSI ───────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
}

// ─── Slug mapping: CoverManager slug → RestaurantLocation name ─

const SLUG_MAP: Record<string, string> = {
  "restaurante-voltereta": "Voltereta Casa",
  "restaurante-voltereta-bali": "Voltereta Bali",
  "restaurante-voltereta-nuevo": "Voltereta Manhattan",
  "restaurante-voltereta-alameda": "Voltereta Kioto",
  "restaurante-volteretaalc": "Voltereta Tanzania",
  "resturante-voltereta-sevilla": "Voltereta París",
  "restaurante-voltereta-zaragoza": "Voltereta Nueva Zelanda",
  "voltereta-cordoba": "Voltereta Toscana",
}

// ─── Seed slugs ─────────────────────────────────────────────────

async function doSeedSlugs() {
  console.log(`${c.bold}${c.blue}=== Poblar cmSlug en RestaurantLocation ===${c.reset}\n`)

  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true },
    select: { id: true, name: true, cmSlug: true },
  })

  console.log(`Localizaciones activas: ${locations.length}\n`)

  for (const [slug, partialName] of Object.entries(SLUG_MAP)) {
    const match = locations.find(
      (l) =>
        l.name.toLowerCase().includes(partialName.toLowerCase()) ||
        partialName.toLowerCase().includes(l.name.toLowerCase().split(" ")[1] || "")
    )

    if (match) {
      if (match.cmSlug === slug) {
        console.log(`  ${c.dim}✓ ${match.name} → ${slug} (ya configurado)${c.reset}`)
      } else {
        if (write) {
          await prisma.restaurantLocation.update({
            where: { id: match.id },
            data: { cmSlug: slug },
          })
          console.log(`  ${c.green}✓ ${match.name} → ${slug} (actualizado)${c.reset}`)
        } else {
          console.log(`  ${c.yellow}○ ${match.name} → ${slug} (dry-run)${c.reset}`)
        }
      }
    } else {
      // Crear nueva locación
      if (write) {
        const cmData = await fetchRestaurantInfo(slug)
        await prisma.restaurantLocation.create({
          data: {
            name: cmData?.name || partialName,
            city: cmData?.city || "Desconocida",
            address: cmData?.address || null,
            aemetMunicipioId: "00000",
            latitude: parseFloat(cmData?.latitude || "0"),
            longitude: parseFloat(cmData?.longitude || "0"),
            cmSlug: slug,
          },
        })
        console.log(`  ${c.green}+ Creado: ${partialName} → ${slug}${c.reset}`)
      } else {
        console.log(`  ${c.yellow}+ Crear: ${partialName} → ${slug} (dry-run)${c.reset}`)
      }
    }
  }

  if (!write) {
    console.log(`\n${c.yellow}Usa --write para aplicar cambios${c.reset}`)
  }
}

async function fetchRestaurantInfo(slug: string) {
  const apiKey = process.env.COVERMANAGER_API_KEY!
  const res = await fetch(
    `https://www.covermanager.com/api/restaurant/slug/${apiKey}/${slug}`,
    { signal: AbortSignal.timeout(10000) }
  )
  const data = (await res.json()) as {
    resp: number
    name?: string
    city?: string
    address?: string
    latitude?: string
    longitude?: string
  }
  return data.resp === 1 ? data : null
}

// ─── Sync principal ─────────────────────────────────────────────

async function doSync() {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const dateStart = startDate.toISOString().slice(0, 10)
  const dateEnd = endDate.toISOString().slice(0, 10)

  console.log(`${c.bold}${c.blue}=== Sync Comensales CoverManager → BD ===${c.reset}`)
  console.log(`  Modo: ${write ? `${c.green}ESCRITURA${c.reset}` : `${c.yellow}DRY-RUN${c.reset}`}`)
  console.log(`  Rango: ${dateStart} → ${dateEnd} (${days} días)`)
  console.log()

  // Importar dinámicamente el orchestrator (necesita resolver @/ paths)
  // Como estamos en un script standalone, hacemos el sync directamente aquí

  const apiKey = process.env.COVERMANAGER_API_KEY!
  const BASE = "https://www.covermanager.com/api"

  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true, cmSlug: { not: null } },
    select: { id: true, name: true, cmSlug: true },
  })

  if (locations.length === 0) {
    console.log(`${c.red}No hay restaurantes con cmSlug configurado.`)
    console.log(`Ejecuta primero: npx tsx scripts/sync-covers-from-covermanager.ts --seed-slugs --write${c.reset}`)
    return
  }

  console.log(`Restaurantes: ${locations.length}\n`)

  // Log de sincronización
  const syncLog = await prisma.coverSyncLog.create({
    data: {
      status: "RUNNING",
      dateRangeStart: new Date(dateStart),
      dateRangeEnd: new Date(dateEnd),
    },
  })

  let totalCreated = 0
  let totalUpdated = 0
  const allErrors: string[] = []

  for (const location of locations) {
    const slug = location.cmSlug!
    console.log(`${c.cyan}▸ ${location.name}${c.reset} (${slug})`)

    const dates: string[] = []
    const d = new Date(dateStart)
    const endD = new Date(dateEnd)
    while (d <= endD) {
      dates.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }

    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      try {
        const res = await fetch(`${BASE}/stats/get_resumen_date`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiKey },
          body: JSON.stringify({ restaurant: slug, date }),
          signal: AbortSignal.timeout(15000),
        })
        const stats = (await res.json()) as {
          resp: number
          lunch: Record<string, number>
          dinner: Record<string, number>
        }

        if (stats.resp !== 1) {
          allErrors.push(`${slug}/${date}: resp=${stats.resp}`)
          continue
        }

        const lunch = stats.lunch || {}
        const dinner = stats.dinner || {}
        const lunchCovers =
          (lunch.people_seated || 0) + (lunch.people_walkin || 0)
        const dinnerCovers =
          (dinner.people_seated || 0) + (dinner.people_walkin || 0)
        const totalCovers = lunchCovers + dinnerCovers

        const lunchReservs =
          (lunch.reservs_seated || 0) + (lunch.reservs_walkin || 0)
        const dinnerReservs =
          (dinner.reservs_seated || 0) + (dinner.reservs_walkin || 0)
        const totalReservations = lunchReservs + dinnerReservs

        if (totalCovers === 0 && totalReservations === 0) {
          skipped++
          continue
        }

        const avgPartySize =
          totalReservations > 0 ? totalCovers / totalReservations : 0

        const coversByStatus: Record<string, number> = {}
        for (const svc of [lunch, dinner]) {
          if (svc.people_seated) coversByStatus.seated = (coversByStatus.seated || 0) + svc.people_seated
          if (svc.people_walkin) coversByStatus.walkin = (coversByStatus.walkin || 0) + svc.people_walkin
          if (svc.people_cancel) coversByStatus.cancelled = (coversByStatus.cancelled || 0) + svc.people_cancel
          if (svc.people_noshow) coversByStatus.noshow = (coversByStatus.noshow || 0) + svc.people_noshow
        }

        const walkInCovers =
          (lunch.people_walkin || 0) + (dinner.people_walkin || 0)

        if (!write) {
          created++
          continue
        }

        const existing = await prisma.coverSnapshot.findUnique({
          where: {
            restaurantLocationId_date: {
              restaurantLocationId: location.id,
              date: new Date(date),
            },
          },
          select: { id: true },
        })

        const snapshotData = {
          totalCovers,
          totalReservations,
          avgPartySize,
          maxPartySize: 0,
          coversByStatus,
          lunchCovers,
          dinnerCovers,
          walkInCovers,
          syncedAt: new Date(),
        }

        if (existing) {
          await prisma.coverSnapshot.update({
            where: { id: existing.id },
            data: snapshotData,
          })
          updated++
        } else {
          await prisma.coverSnapshot.create({
            data: {
              restaurantLocationId: location.id,
              date: new Date(date),
              ...snapshotData,
            },
          })
          created++
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 100))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        allErrors.push(`${slug}/${date}: ${msg}`)
      }

      // Progreso cada 50 días
      if ((i + 1) % 50 === 0) {
        const pct = Math.round(((i + 1) / dates.length) * 100)
        process.stdout.write(`  ${pct}% `)
      }
    }

    totalCreated += created
    totalUpdated += updated

    console.log(
      `  ${c.green}✓ ${created} creados${c.reset}, ${c.blue}${updated} actualizados${c.reset}, ${c.dim}${skipped} vacíos${c.reset}`
    )
  }

  // Actualizar log
  await prisma.coverSyncLog.update({
    where: { id: syncLog.id },
    data: {
      status: allErrors.length > 0 ? "PARTIAL" : "SUCCESS",
      snapshotsCreated: totalCreated,
      snapshotsUpdated: totalUpdated,
      errors: allErrors.length > 0 ? allErrors : undefined,
      durationMs: Date.now() - syncLog.startedAt.getTime(),
      finishedAt: new Date(),
    },
  })

  console.log(`\n${c.bold}=== Resumen ===${c.reset}`)
  console.log(`  Creados: ${c.green}${totalCreated}${c.reset}`)
  console.log(`  Actualizados: ${c.blue}${totalUpdated}${c.reset}`)
  if (allErrors.length > 0) {
    console.log(`  Errores: ${c.red}${allErrors.length}${c.reset}`)
    allErrors.slice(0, 5).forEach((e) => console.log(`    ${c.red}• ${e}${c.reset}`))
    if (allErrors.length > 5) console.log(`    ... y ${allErrors.length - 5} más`)
  }
  if (!write) {
    console.log(`\n${c.yellow}Modo DRY-RUN — usa --write para guardar en BD${c.reset}`)
  }
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  try {
    if (seedSlugs) {
      await doSeedSlugs()
    } else {
      await doSync()
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(`${c.red}Fatal:${c.reset}`, e)
  process.exit(1)
})
