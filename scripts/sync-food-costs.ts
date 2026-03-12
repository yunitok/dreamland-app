/**
 * Sincronización de costes desde GStock → FoodCostSnapshot
 *
 * Consume los endpoints de coste real, coste teórico y variación de stock
 * de la API de GStock para cada centro mapeado, y los almacena como snapshots mensuales.
 *
 * Prerequisito: RestaurantLocation debe tener gstockCenterId configurado.
 *
 * Ejecución:
 *   npx tsx scripts/sync-food-costs.ts                                     # Mes actual (dry-run)
 *   npx tsx scripts/sync-food-costs.ts --write                             # Mes actual (escritura)
 *   npx tsx scripts/sync-food-costs.ts --write --from=2025-07-01 --to=2026-03-01  # Rango
 *   npx tsx scripts/sync-food-costs.ts --write --months=6                  # Últimos 6 meses
 *   npx tsx scripts/sync-food-costs.ts --write --verbose                   # Con detalle
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { fetchGstock } from "../src/lib/gstock"
import {
  extractRealCost,
  extractTheoreticalCost,
  extractStockVariation,
  calculateVariance,
  calculateFoodCostPercent,
} from "../src/modules/sherlock/domain/food-cost-sync/mappers"
import type { FoodCostSyncResult } from "../src/modules/sherlock/domain/food-cost-sync/types"

// ─── Setup Prisma (standalone) ──────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2)
const write = args.includes("--write")
const dryRun = !write
const verbose = args.includes("--verbose")
const monthsArg = args.find((a) => a.startsWith("--months="))
const fromArg = args.find((a) => a.startsWith("--from="))?.split("=")[1]
const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1]
const months = monthsArg ? parseInt(monthsArg.split("=")[1]) : 1

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

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Genera rangos mensuales entre dos fechas.
 * Cada rango es [primerDíaMes, últimoDíaMes].
 */
function getMonthlyRanges(
  from: Date,
  to: Date
): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = []
  const current = new Date(from)
  current.setDate(1) // inicio del mes

  while (current <= to) {
    const monthStart = new Date(current)
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
    const effectiveEnd = monthEnd > to ? to : monthEnd

    ranges.push({
      start: formatDate(monthStart),
      end: formatDate(effectiveEnd),
    })

    current.setMonth(current.getMonth() + 1)
  }

  return ranges
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n${c.bold}${c.blue}═══ Sync Food Costs (GStock → FoodCostSnapshot) ═══${c.reset}`
  )
  console.log(`  Modo: ${dryRun ? `${c.yellow}DRY-RUN${c.reset}` : `${c.green}ESCRITURA${c.reset}`}`)

  // 1. Obtener locales con gstockCenterId
  const locations = await prisma.restaurantLocation.findMany({
    where: {
      isActive: true,
      gstockCenterId: { not: null },
    },
    select: { id: true, name: true, gstockCenterId: true },
  })

  if (locations.length === 0) {
    console.log(
      `\n  ${c.red}No hay locales con gstockCenterId configurado.${c.reset}`
    )
    console.log(
      `  Configura el mapeo en GastroLab > Settings o actualiza RestaurantLocation.gstockCenterId.`
    )
    return
  }

  console.log(`  Locales con GStock: ${locations.length}`)

  // 2. Calcular rangos de fechas
  let fromDate: Date
  let toDate: Date

  if (fromArg) {
    fromDate = new Date(fromArg + "T00:00:00Z")
    toDate = toArg ? new Date(toArg + "T00:00:00Z") : new Date()
  } else {
    toDate = new Date()
    fromDate = new Date()
    fromDate.setMonth(fromDate.getMonth() - months + 1)
    fromDate.setDate(1)
  }

  const ranges = getMonthlyRanges(fromDate, toDate)
  console.log(
    `  Periodo: ${formatDate(fromDate)} → ${formatDate(toDate)} (${ranges.length} mes${ranges.length > 1 ? "es" : ""})`
  )

  // 3. Sincronizar
  const results: FoodCostSyncResult[] = []
  let created = 0
  let updated = 0
  let errors = 0

  for (const loc of locations) {
    console.log(
      `\n${c.bold}${c.cyan}── ${loc.name} (centro ${loc.gstockCenterId}) ──${c.reset}`
    )

    for (const range of ranges) {
      try {
        const centerId = loc.gstockCenterId!
        const params = `centerId=${centerId}&startDate=${range.start}&endDate=${range.end}`

        // Fetch GStock data en paralelo
        const [costRealsRes, costTheoreticalsRes, stockVariationsRes] =
          await Promise.all([
            fetchGstock(`v1/costReals?${params}`).catch(() => ({ data: [] })),
            fetchGstock(`v1/costTheoreticals?${params}`).catch(() => ({
              data: [],
            })),
            fetchGstock(`v1/stockVariations?${params}`).catch(() => ({
              data: [],
            })),
          ])

        const { total: realCostTotal, byCategory: realCostByCategory } =
          extractRealCost(costRealsRes.data)
        const theoreticalCostTotal = extractTheoreticalCost(
          costTheoreticalsRes.data
        )
        const stockVariationTotal = extractStockVariation(
          stockVariationsRes.data
        )

        const { variance, variancePercent } = calculateVariance(
          realCostTotal,
          theoreticalCostTotal
        )

        // Revenue del periodo (de AgoraSalesSnapshot)
        const revenueAgg = await prisma.agoraSalesSnapshot.aggregate({
          where: {
            restaurantLocationId: loc.id,
            businessDay: { gte: new Date(range.start), lte: new Date(range.end) },
          },
          _sum: { totalGrossAmount: true },
        })
        const periodRevenue = revenueAgg._sum.totalGrossAmount
        const foodCostPercent = calculateFoodCostPercent(
          realCostTotal,
          periodRevenue
        )

        if (verbose) {
          console.log(`  ${range.start} → ${range.end}:`)
          console.log(`    Coste Real: ${realCostTotal.toFixed(2)}€`)
          console.log(`    Coste Teórico: ${theoreticalCostTotal.toFixed(2)}€`)
          console.log(
            `    Varianza: ${variance.toFixed(2)}€ (${variancePercent.toFixed(1)}%)`
          )
          console.log(
            `    Revenue: ${periodRevenue?.toFixed(2) ?? "N/A"}€ → Food Cost: ${foodCostPercent?.toFixed(1) ?? "N/A"}%`
          )
        }

        if (!dryRun) {
          const existing = await prisma.foodCostSnapshot.findUnique({
            where: {
              restaurantLocationId_periodStart_periodEnd: {
                restaurantLocationId: loc.id,
                periodStart: new Date(range.start),
                periodEnd: new Date(range.end),
              },
            },
          })

          await prisma.foodCostSnapshot.upsert({
            where: {
              restaurantLocationId_periodStart_periodEnd: {
                restaurantLocationId: loc.id,
                periodStart: new Date(range.start),
                periodEnd: new Date(range.end),
              },
            },
            create: {
              restaurantLocationId: loc.id,
              periodStart: new Date(range.start),
              periodEnd: new Date(range.end),
              realCostTotal,
              realCostByCategory: JSON.parse(JSON.stringify(realCostByCategory)),
              theoreticalCostTotal,
              variance,
              variancePercent,
              periodRevenue,
              foodCostPercent,
              stockVariationTotal,
            },
            update: {
              realCostTotal,
              realCostByCategory: JSON.parse(JSON.stringify(realCostByCategory)),
              theoreticalCostTotal,
              variance,
              variancePercent,
              periodRevenue,
              foodCostPercent,
              stockVariationTotal,
              syncedAt: new Date(),
            },
          })

          if (existing) {
            updated++
            results.push({
              locationId: loc.id,
              locationName: loc.name,
              centerId: centerId,
              periodStart: range.start,
              periodEnd: range.end,
              realCostTotal,
              theoreticalCostTotal,
              variance,
              variancePercent,
              periodRevenue,
              foodCostPercent,
              stockVariationTotal,
              status: "updated",
            })
          } else {
            created++
            results.push({
              locationId: loc.id,
              locationName: loc.name,
              centerId: centerId,
              periodStart: range.start,
              periodEnd: range.end,
              realCostTotal,
              theoreticalCostTotal,
              variance,
              variancePercent,
              periodRevenue,
              foodCostPercent,
              stockVariationTotal,
              status: "created",
            })
          }
        } else {
          console.log(
            `  ${c.yellow}○ ${range.start}→${range.end}: Real=${realCostTotal.toFixed(0)}€ Teórico=${theoreticalCostTotal.toFixed(0)}€ Var=${variancePercent.toFixed(1)}% (dry-run)${c.reset}`
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(
          `  ${c.red}✗ ${range.start}→${range.end}: ${msg}${c.reset}`
        )
        errors++
        results.push({
          locationId: loc.id,
          locationName: loc.name,
          centerId: loc.gstockCenterId!,
          periodStart: range.start,
          periodEnd: range.end,
          realCostTotal: 0,
          theoreticalCostTotal: 0,
          variance: 0,
          variancePercent: 0,
          periodRevenue: null,
          foodCostPercent: null,
          stockVariationTotal: null,
          status: "error",
          error: msg,
        })
      }
    }
  }

  // 4. Resumen
  console.log(
    `\n${c.bold}${c.green}═══ Resumen ═══${c.reset}`
  )
  console.log(`  Creados: ${created}`)
  console.log(`  Actualizados: ${updated}`)
  console.log(`  Errores: ${errors}`)
  console.log(`  Total snapshots: ${created + updated}`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
