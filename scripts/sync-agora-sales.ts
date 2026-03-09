/**
 * Sincronizacion de ventas desde Agora TPV → BD
 *
 * Usa la API de exportacion de Agora para obtener facturas diarias,
 * cierres de caja y maestros (productos, familias).
 *
 * Prerequisito: RestaurantLocation debe tener agoraPosId configurado.
 *
 * Ejecucion:
 *   npx tsx scripts/sync-agora-sales.ts                                       # Ventas hoy (dry-run)
 *   npx tsx scripts/sync-agora-sales.ts --write                               # Ventas hoy (escritura)
 *   npx tsx scripts/sync-agora-sales.ts --write --days=30                     # Ultimos 30 dias
 *   npx tsx scripts/sync-agora-sales.ts --write --from=2025-07-01 --to=2025-07-31  # Rango especifico
 *   npx tsx scripts/sync-agora-sales.ts --write --master                      # Solo maestros
 *   npx tsx scripts/sync-agora-sales.ts --write --full                        # Maestros + ventas 90 dias
 *   npx tsx scripts/sync-agora-sales.ts --dry-run --days=7                    # Dry-run 7 dias
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  fetchAgoraSales,
  fetchAgoraMaster,
  testAgoraConnection,
  agoraDelay,
  normalizeAgoraInvoices,
  normalizeAgoraPosCloseOuts,
  type AgoraWorkplaceExport,
} from "../src/lib/agora"
import {
  aggregateInvoicesToSnapshot,
  mapAgoraProduct,
  buildFamilyMap,
} from "../src/modules/sherlock/domain/agora-sync/mappers"
import { normalize } from "../src/modules/sherlock/domain/yurest-matching/name-normalizer"
import type { AgoraSyncType } from "../src/modules/sherlock/domain/agora-sync/types"

// ─── Setup Prisma (standalone) ──────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2)
const write = args.includes("--write")
const dryRun = args.includes("--dry-run") || !write
const master = args.includes("--master")
const full = args.includes("--full")
const verbose = args.includes("--verbose")
const daysArg = args.find((a) => a.startsWith("--days="))
const fromArg = args.find((a) => a.startsWith("--from="))?.split("=")[1]
const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1]
const days = daysArg ? parseInt(daysArg.split("=")[1]) : full ? 90 : 1

const syncType: AgoraSyncType = master ? "master" : full ? "full" : "sales"

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
  magenta: "\x1b[35m",
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dateRange(daysBack: number): string[] {
  const dates: string[] = []

  // Si se especifica --from/--to, usar rango explícito
  if (fromArg) {
    const start = new Date(fromArg + "T00:00:00Z")
    const end = toArg ? new Date(toArg + "T00:00:00Z") : new Date()
    const d = new Date(start)
    while (d <= end) {
      dates.push(formatDate(d))
      d.setUTCDate(d.getUTCDate() + 1)
    }
    return dates
  }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - daysBack + 1)
  const d = new Date(start)
  while (d <= end) {
    dates.push(formatDate(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

// ─── Sync Maestros ──────────────────────────────────────────────

async function syncMaster() {
  console.log(`\n${c.bold}${c.blue}── Fase: Maestros ──${c.reset}`)

  const masterResult = await fetchAgoraMaster("Families,Products,WorkplacesSummary")

  const families = masterResult.data.Families ?? []
  const products = masterResult.data.Products ?? []
  const workplaces = (masterResult.data.WorkplacesSummary ?? []) as AgoraWorkplaceExport[]

  console.log(`  Familias: ${families.length}`)
  console.log(`  Productos: ${products.length}`)
  console.log(`  Workplaces: ${workplaces.length}`)

  // Sync Workplaces → RestaurantLocation.agoraPosId
  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true },
    select: { id: true, name: true, agoraPosId: true },
  })

  let workplacesLinked = 0
  for (const wp of workplaces) {
    const existing = locations.find((l) => l.agoraPosId === wp.Id)
    if (existing) {
      if (verbose) console.log(`  ${c.dim}✓ ${wp.Name} → ${existing.name} (ya vinculado)${c.reset}`)
      workplacesLinked++
      continue
    }

    const normWp = normalize(wp.Name)
    const match = locations.find((l) => {
      const normLoc = normalize(l.name)
      return normLoc.includes(normWp) || normWp.includes(normLoc)
    })

    if (match && !dryRun) {
      await prisma.restaurantLocation.update({
        where: { id: match.id },
        data: { agoraPosId: wp.Id },
      })
      console.log(`  ${c.green}✓ Workplace "${wp.Name}" → ${match.name}${c.reset}`)
      workplacesLinked++
    } else if (match) {
      console.log(`  ${c.yellow}○ Workplace "${wp.Name}" → ${match.name} (dry-run)${c.reset}`)
      workplacesLinked++
    } else {
      console.log(`  ${c.red}✗ Workplace "${wp.Name}" — sin match${c.reset}`)
    }
  }

  // Sync productos
  let productsCreated = 0
  let productsUpdated = 0
  const BATCH = 50

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    if (!dryRun) {
      await prisma.$transaction(
        batch.map((raw) => {
          const mapped = mapAgoraProduct(raw, families)
          return prisma.agoraProduct.upsert({
            where: { agoraId: mapped.agoraId },
            create: mapped,
            update: mapped,
          })
        })
      )
    }

    for (const raw of batch) {
      const existing = !dryRun
        ? await prisma.agoraProduct.findUnique({ where: { agoraId: raw.Id }, select: { id: true } })
        : null
      if (existing) productsUpdated++
      else productsCreated++
    }

    if ((i + BATCH) % 200 === 0 || i + BATCH >= products.length) {
      const pct = Math.round(((i + BATCH) / products.length) * 100)
      process.stdout.write(`  Productos: ${Math.min(pct, 100)}%\r`)
    }
  }

  console.log(`  ${c.green}Productos: ${productsCreated} creados, ${productsUpdated} actualizados${c.reset}`)
  console.log(`  ${c.green}Workplaces vinculados: ${workplacesLinked}${c.reset}`)

  // Matching productos → recetas
  if (!dryRun) {
    await matchProductsToRecipes()
  }

  return { productsCreated, productsUpdated, workplacesLinked }
}

async function matchProductsToRecipes() {
  console.log(`\n${c.bold}${c.blue}── Fase: Matching Productos → Recetas ──${c.reset}`)

  const unmatched = await prisma.agoraProduct.findMany({
    where: { recipeId: null, isActive: true },
    select: { id: true, name: true },
  })

  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true },
  })

  const recipeIndex = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    normalized: normalize(r.name),
  }))

  let matched = 0
  for (const prod of unmatched) {
    const normProd = normalize(prod.name)

    // Buscar match exacto primero
    let match = recipeIndex.find((r) => r.normalized === normProd)

    // Luego containment con ratio > 0.5
    if (!match) {
      match = recipeIndex.find((r) => {
        const longer = Math.max(r.normalized.length, normProd.length)
        const shorter = Math.min(r.normalized.length, normProd.length)
        if (shorter / longer < 0.5) return false
        return r.normalized.includes(normProd) || normProd.includes(r.normalized)
      })
    }

    if (match) {
      await prisma.agoraProduct.update({
        where: { id: prod.id },
        data: { recipeId: match.id },
      })
      matched++
      if (verbose) console.log(`  ${c.dim}${prod.name} → ${match.name}${c.reset}`)
    }
  }

  console.log(`  ${c.green}Matched: ${matched}/${unmatched.length} productos sin vincular${c.reset}`)
}

// ─── Sync Ventas ────────────────────────────────────────────────

async function syncSales() {
  const dates = dateRange(days)
  const dateStart = dates[0]
  const dateEnd = dates[dates.length - 1]

  console.log(`\n${c.bold}${c.blue}── Fase: Ventas ──${c.reset}`)
  console.log(`  Rango: ${dateStart} → ${dateEnd} (${dates.length} dias)`)

  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true, agoraPosId: { not: null } },
    select: { id: true, name: true, agoraPosId: true },
  })

  if (locations.length === 0) {
    console.log(`${c.red}No hay restaurantes con agoraPosId. Ejecuta primero con --master --write${c.reset}`)
    return { snapshotsCreated: 0, snapshotsUpdated: 0 }
  }

  console.log(`  Locales: ${locations.length}`)

  // Mapa directo: WorkplaceId (= agoraPosId) → {id, name}
  const workplaceToLocation = new Map<number, { id: string; name: string }>()
  for (const l of locations) {
    if (l.agoraPosId !== null) {
      workplaceToLocation.set(l.agoraPosId, { id: l.id, name: l.name })
    }
  }
  console.log(`  Workplaces mapeados: ${workplaceToLocation.size}`)

  // Cargar familias para el mapa
  const masterResult2 = await fetchAgoraMaster("Families")
  const familyMap = buildFamilyMap(masterResult2.data.Families ?? [])

  let snapshotsCreated = 0
  let snapshotsUpdated = 0
  const errors: string[] = []

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]

    try {
      const exportResult = await fetchAgoraSales(date, "Invoices,PosCloseOuts")
      // Normalizar respuesta de Agora (estructura anidada → plana)
      const invoices = normalizeAgoraInvoices(exportResult.data.Invoices ?? [])
      const closeOuts = normalizeAgoraPosCloseOuts(exportResult.data.PosCloseOuts ?? [])

      if (invoices.length === 0 && closeOuts.length === 0) {
        if (verbose) console.log(`  ${c.dim}${date}: sin datos${c.reset}`)
        continue
      }

      // Agrupar por restaurante via WorkplaceId directo
      const byLocation = new Map<string, { name: string; invoices: typeof invoices; closeOuts: typeof closeOuts }>()
      // Mapa PosId → locationId inferido desde facturas
      const posToLocation = new Map<number, string>()

      for (const inv of invoices) {
        const wpId = inv.WorkplaceId
        if (!wpId) {
          if (verbose) console.log(`  ${c.dim}${date}: factura ${inv.Serie}-${inv.Number} sin WorkplaceId${c.reset}`)
          continue
        }
        const loc = workplaceToLocation.get(wpId)
        if (!loc) {
          if (verbose) console.log(`  ${c.dim}${date}: WorkplaceId ${wpId} sin local vinculado${c.reset}`)
          continue
        }
        const entry = byLocation.get(loc.id) ?? { name: loc.name, invoices: [], closeOuts: [] }
        entry.invoices.push(inv)
        byLocation.set(loc.id, entry)
        if (inv.PosId) posToLocation.set(inv.PosId, loc.id)
      }

      // Asignar cierres de caja por PosId
      for (const co of closeOuts) {
        const locationId = posToLocation.get(co.PosId)
        if (!locationId) continue
        const entry = byLocation.get(locationId)
        if (entry) entry.closeOuts.push(co)
      }

      for (const [locationId, locData] of byLocation) {
        const location = { id: locationId, name: locData.name }
        const posInvoices = locData.invoices
        const posCloseOuts = locData.closeOuts
        const snapshot = aggregateInvoicesToSnapshot(posInvoices, posCloseOuts, familyMap)

        if (!dryRun) {
          const existing = await prisma.agoraSalesSnapshot.findUnique({
            where: {
              restaurantLocationId_businessDay: {
                restaurantLocationId: location.id,
                businessDay: new Date(date + "T00:00:00Z"),
              },
            },
            select: { id: true },
          })

          const data = {
            totalInvoices: snapshot.totalInvoices,
            totalGrossAmount: snapshot.totalGrossAmount,
            totalNetAmount: snapshot.totalNetAmount,
            totalAmount: snapshot.totalAmount,
            totalGuests: snapshot.totalGuests,
            avgTicket: snapshot.avgTicket,
            avgSpendPerGuest: snapshot.avgSpendPerGuest,
            salesByFamily: JSON.parse(JSON.stringify(snapshot.salesByFamily)),
            salesByPaymentMethod: JSON.parse(JSON.stringify(snapshot.salesByPaymentMethod)),
            salesByHour: JSON.parse(JSON.stringify(snapshot.salesByHour)),
            topProducts: JSON.parse(JSON.stringify(snapshot.topProducts)),
            taxBreakdown: JSON.parse(JSON.stringify(snapshot.taxBreakdown)),
            cashExpected: snapshot.cashExpected,
            cashReal: snapshot.cashReal,
            cashDifference: snapshot.cashDifference,
            syncedAt: new Date(),
          }

          if (existing) {
            await prisma.agoraSalesSnapshot.update({
              where: { id: existing.id },
              data,
            })
            snapshotsUpdated++
          } else {
            await prisma.agoraSalesSnapshot.create({
              data: {
                restaurantLocationId: location.id,
                businessDay: new Date(date + "T00:00:00Z"),
                ...data,
              },
            })
            snapshotsCreated++
          }
        } else {
          snapshotsCreated++
          if (verbose) {
            console.log(
              `  ${c.yellow}○ ${date} ${location.name}: ${posInvoices.length} facturas, €${snapshot.totalAmount} (dry-run)${c.reset}`
            )
          }
        }
      }

      // Rate limiting conservador
      await agoraDelay()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${date}: ${msg}`)
      if (verbose) console.log(`  ${c.red}✗ ${date}: ${msg}${c.reset}`)
    }

    // Progreso
    if ((i + 1) % 10 === 0 || i === dates.length - 1) {
      const pct = Math.round(((i + 1) / dates.length) * 100)
      process.stdout.write(
        `  ${c.cyan}Progreso: ${pct}% (${i + 1}/${dates.length} dias)${c.reset}\r`
      )
    }
  }

  console.log()

  if (errors.length > 0) {
    console.log(`  ${c.red}Errores: ${errors.length}${c.reset}`)
    errors.slice(0, 5).forEach((e) => console.log(`    ${c.red}• ${e}${c.reset}`))
    if (errors.length > 5) console.log(`    ... y ${errors.length - 5} mas`)
  }

  return { snapshotsCreated, snapshotsUpdated, errors }
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`${c.bold}${c.magenta}=== Sync Agora TPV → BD ===${c.reset}`)
  console.log(`  Tipo: ${c.cyan}${syncType}${c.reset}`)
  console.log(`  Modo: ${dryRun ? `${c.yellow}DRY-RUN${c.reset}` : `${c.green}ESCRITURA${c.reset}`}`)
  if (syncType !== "master") {
    if (fromArg) {
      console.log(`  Rango: ${fromArg} → ${toArg ?? "hoy"}`)
    } else {
      console.log(`  Dias: ${days}`)
    }
  }

  // Guard: evitar syncs concurrentes
  const running = await prisma.agoraSyncLog.findFirst({
    where: { status: "RUNNING" },
    select: { id: true, startedAt: true },
  })
  if (running) {
    const staleMs = 30 * 60 * 1000
    const isStale = Date.now() - running.startedAt.getTime() > staleMs
    if (!isStale) {
      console.log(`${c.red}Ya hay un sync en curso (iniciado: ${running.startedAt.toISOString()}). Aborta o espera.${c.reset}`)
      process.exit(1)
    }
    await prisma.agoraSyncLog.update({
      where: { id: running.id },
      data: {
        status: "FAILED",
        errors: JSON.parse(JSON.stringify(["Marcado como fallido por timeout (>30min)"])),
        finishedAt: new Date(),
      },
    })
    console.log(`${c.yellow}Sync anterior marcado como FAILED (stale >30min)${c.reset}`)
  }

  // Test conexion
  console.log(`\n${c.bold}${c.blue}── Fase: Test conexion ──${c.reset}`)
  const conn = await testAgoraConnection()
  if (!conn.ok) {
    console.log(`${c.red}Error de conexion: ${conn.error}${c.reset}`)
    process.exit(1)
  }
  console.log(`  ${c.green}✓ Conexion OK${c.reset}`)

  const startTime = Date.now()
  let productsCreated = 0
  let productsUpdated = 0
  let snapshotsCreated = 0
  let snapshotsUpdated = 0

  // Sync maestros
  if (syncType === "master" || syncType === "full") {
    const masterResult = await syncMaster()
    productsCreated = masterResult.productsCreated
    productsUpdated = masterResult.productsUpdated
  }

  // Sync ventas
  if (syncType === "sales" || syncType === "full") {
    const salesResult = await syncSales()
    snapshotsCreated = salesResult.snapshotsCreated
    snapshotsUpdated = salesResult.snapshotsUpdated
  }

  const durationMs = Date.now() - startTime

  // Log de sync
  if (!dryRun) {
    await prisma.agoraSyncLog.create({
      data: {
        syncType,
        status: "SUCCESS",
        dateRangeStart: syncType !== "master" ? new Date(dateRange(days)[0]) : null,
        dateRangeEnd: syncType !== "master" ? new Date(dateRange(days).slice(-1)[0]) : null,
        snapshotsCreated,
        snapshotsUpdated,
        productsCreated,
        productsUpdated,
        durationMs,
        finishedAt: new Date(),
      },
    })
  }

  // Resumen
  console.log(`\n${c.bold}=== Resumen ===${c.reset}`)
  console.log(`  Duracion: ${(durationMs / 1000).toFixed(1)}s`)
  if (syncType !== "sales") {
    console.log(`  Productos: ${c.green}${productsCreated} creados${c.reset}, ${c.blue}${productsUpdated} actualizados${c.reset}`)
  }
  if (syncType !== "master") {
    console.log(`  Snapshots: ${c.green}${snapshotsCreated} creados${c.reset}, ${c.blue}${snapshotsUpdated} actualizados${c.reset}`)
  }
  if (dryRun) {
    console.log(`\n${c.yellow}Modo DRY-RUN — usa --write para guardar en BD${c.reset}`)
  }
}

main()
  .catch((e) => {
    console.error(`${c.red}Fatal:${c.reset}`, e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
