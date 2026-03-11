import { prisma } from "@/lib/prisma"
import { fetchCoverManagerPost } from "@/lib/covermanager"
import { aggregateFromStats } from "./cover-aggregator"
import type {
  CoverManagerStatsResponse,
  CoverSyncOptions,
  CoverSyncReport,
} from "./types"

// ─── Helpers ────────────────────────────────────────────────────

/** Genera array de fechas ISO entre start y end (inclusive) */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start)
  const endD = new Date(end)
  while (d <= endD) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

/** Delay para rate limiting */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function log(options: CoverSyncOptions, ...args: unknown[]) {
  if (options.verbose) console.log("[Cover Sync]", ...args)
}

// ─── Sync principal ─────────────────────────────────────────────

export async function syncCoversFromCoverManager(
  options: CoverSyncOptions
): Promise<CoverSyncReport[]> {
  const locations = await prisma.restaurantLocation.findMany({
    where: {
      isActive: true,
      cmSlug: { not: null },
      ...(options.restaurantLocationId
        ? { id: options.restaurantLocationId }
        : {}),
    },
    select: { id: true, name: true, cmSlug: true },
  })

  log(options, `Found ${locations.length} restaurants with cmSlug`)

  const reports: CoverSyncReport[] = []

  for (const location of locations) {
    const report = await syncSingleRestaurant(location, options)
    reports.push(report)
  }

  return reports
}

async function syncSingleRestaurant(
  location: { id: string; name: string; cmSlug: string | null },
  options: CoverSyncOptions
): Promise<CoverSyncReport> {
  const startTime = Date.now()
  const errors: string[] = []
  let created = 0
  let updated = 0
  const slug = location.cmSlug!

  log(options, `\nSyncing: ${location.name} (${slug})`)
  options.onProgress?.("sync", `Sincronizando ${location.name}...`)

  const dates = dateRange(options.dateStart, options.dateEnd)
  log(options, `  ${dates.length} days to process`)

  // Procesar en lotes de 10 días para dar feedback de progreso
  const BATCH_SIZE = 10

  for (let i = 0; i < dates.length; i += BATCH_SIZE) {
    const batch = dates.slice(i, i + BATCH_SIZE)

    for (const date of batch) {
      try {
        const stats =
          await fetchCoverManagerPost<CoverManagerStatsResponse>(
            "stats/get_resumen_date",
            { restaurant: slug, date }
          )

        if (stats.resp !== 1) {
          errors.push(`${date}: API resp=${stats.resp}`)
          continue
        }

        const agg = aggregateFromStats(date, stats)

        // Solo guardar si hay actividad (evitar registros vacíos)
        if (agg.totalCovers === 0 && agg.totalReservations === 0) {
          continue
        }

        if (options.dryRun) {
          log(
            options,
            `  [dry-run] ${date}: ${agg.totalCovers} covers, ${agg.totalReservations} reservs`
          )
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

        if (existing) {
          await prisma.coverSnapshot.update({
            where: { id: existing.id },
            data: {
              totalCovers: agg.totalCovers,
              totalReservations: agg.totalReservations,
              avgPartySize: agg.avgPartySize,
              maxPartySize: agg.maxPartySize,
              coversByStatus: agg.coversByStatus,
              lunchCovers: agg.lunchCovers,
              dinnerCovers: agg.dinnerCovers,
              walkInCovers: agg.walkInCovers,
              syncedAt: new Date(),
            },
          })
          updated++
        } else {
          await prisma.coverSnapshot.create({
            data: {
              restaurantLocationId: location.id,
              date: new Date(date),
              totalCovers: agg.totalCovers,
              totalReservations: agg.totalReservations,
              avgPartySize: agg.avgPartySize,
              maxPartySize: agg.maxPartySize,
              coversByStatus: agg.coversByStatus,
              lunchCovers: agg.lunchCovers,
              dinnerCovers: agg.dinnerCovers,
              walkInCovers: agg.walkInCovers,
              syncedAt: new Date(),
            },
          })
          created++
        }

        // Rate limiting: 100ms entre llamadas
        await delay(100)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`${date}: ${msg}`)
        log(options, `  ERROR ${date}: ${msg}`)
      }
    }

    // Progreso
    const pct = Math.min(100, Math.round(((i + batch.length) / dates.length) * 100))
    log(options, `  ${location.name}: ${pct}% (${created} created, ${updated} updated)`)
    options.onProgress?.(
      "sync",
      `${location.name}: ${pct}% — ${created + updated} snapshots`
    )
  }

  return {
    restaurant: slug,
    dateRange: { start: options.dateStart, end: options.dateEnd },
    snapshotsCreated: created,
    snapshotsUpdated: updated,
    errors,
    durationMs: Date.now() - startTime,
  }
}
