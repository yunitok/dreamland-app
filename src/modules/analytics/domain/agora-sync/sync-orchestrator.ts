import { prisma } from "@/lib/prisma"
import {
  fetchAgoraSales,
  fetchAgoraMaster,
  agoraDelay,
  normalizeAgoraInvoices,
  normalizeAgoraPosCloseOuts,
  type AgoraFamilyExport,
  type AgoraProductExport,
  type AgoraWorkplaceExport,
  type AgoraInvoiceExport,
  type AgoraPosCloseOutExport,
} from "@/lib/agora"
import {
  aggregateInvoicesToSnapshot,
  mapAgoraProduct,
  buildFamilyMap,
} from "./mappers"
import { normalize } from "@/modules/gastrolab/domain/yurest-matching/name-normalizer"
import type { AgoraSyncOptions, AgoraSyncReport, AgoraSyncPhase } from "./types"

// ─── Orquestador Principal ─────────────────────────────────────

export async function syncFromAgora(
  options: AgoraSyncOptions
): Promise<AgoraSyncReport> {
  const start = Date.now()
  const { syncType, dryRun = false, verbose = false, onProgress } = options
  const phases: AgoraSyncPhase[] = []
  const errors: string[] = []

  let snapshotsCreated = 0
  let snapshotsUpdated = 0
  let productsCreated = 0
  let productsUpdated = 0
  let familiesSynced = 0
  let saleCentersSynced = 0
  let matchedRecipes = 0

  const log = (msg: string) => {
    if (verbose) console.log(`[agora-sync] ${msg}`)
  }

  // Guard: evitar syncs concurrentes
  if (!dryRun) {
    const running = await prisma.agoraSyncLog.findFirst({
      where: { status: "RUNNING" },
      select: { id: true, startedAt: true },
    })
    if (running) {
      const staleMs = 30 * 60 * 1000
      const isStale = Date.now() - running.startedAt.getTime() > staleMs
      if (!isStale) {
        throw new Error(
          "Ya hay una sincronización en curso. Espera a que termine antes de iniciar otra."
        )
      }
      await prisma.agoraSyncLog.update({
        where: { id: running.id },
        data: {
          status: "FAILED",
          errors: JSON.parse(JSON.stringify(["Marcado como fallido por timeout (>30min)"])),
          finishedAt: new Date(),
        },
      })
      log("Sync anterior marcado como FAILED (stale >30min)")
    }
  }

  // Crear log entry
  let syncLog: { id: string } | null = null
  if (!dryRun) {
    syncLog = await prisma.agoraSyncLog.create({
      data: {
        syncType,
        status: "RUNNING",
        dateRangeStart: options.dateStart ? new Date(options.dateStart) : undefined,
        dateRangeEnd: options.dateEnd ? new Date(options.dateEnd) : undefined,
      },
    })
  }

  try {
    // ── Fase 1: Verificar conexión ───────────────────────────
    const phase1Start = Date.now()
    onProgress?.("connection", "Verificando conexión con Ágora...")
    log("Verificando conexión...")

    const testResult = await fetchAgoraMaster("Series")
    if (!testResult.data) {
      throw new Error("No se pudo conectar con Ágora: respuesta vacía")
    }
    const apiVersion = testResult.apiVersion ?? "desconocida"
    log(`Conectado a Ágora v${apiVersion}`)
    phases.push({
      name: "connection",
      duration: Date.now() - phase1Start,
      detail: `Conectado a Ágora v${apiVersion}`,
    })

    // Delay entre fases
    await agoraDelay()

    // ── Fase 2: Sync Maestros ────────────────────────────────
    let familyMap = new Map<number, string>()
    let families: AgoraFamilyExport[] = []

    if (syncType === "master" || syncType === "full") {
      const phase2Start = Date.now()
      onProgress?.("master", "Sincronizando datos maestros...")
      log("Descargando maestros de Ágora...")

      const masterResult = await fetchAgoraMaster(
        "Families,Products,WorkplacesSummary"
      )
      const master = masterResult.data

      // Familias
      families = master.Families ?? []
      familyMap = buildFamilyMap(families)
      familiesSynced = families.filter((f) => !f.DeletionDate).length
      log(`${familiesSynced} familias encontradas`)

      // Workplaces → RestaurantLocation.agoraPosId
      const workplaces = (master.WorkplacesSummary ?? []) as AgoraWorkplaceExport[]
      if (!dryRun) {
        saleCentersSynced = await syncWorkplaces(workplaces, log)
      } else {
        saleCentersSynced = workplaces.length
        log(`[dry-run] ${workplaces.length} workplaces encontrados`)
      }

      // Productos
      const products = (master.Products ?? []) as AgoraProductExport[]
      const activeProducts = products.filter((p) => !p.DeletionDate)
      log(`${activeProducts.length} productos activos encontrados`)

      if (!dryRun) {
        const result = await syncProducts(activeProducts, families, log)
        productsCreated = result.created
        productsUpdated = result.updated
      } else {
        log(`[dry-run] Se sincronizarían ${activeProducts.length} productos`)
      }

      phases.push({
        name: "master",
        duration: Date.now() - phase2Start,
        detail: `${familiesSynced} familias, ${productsCreated + productsUpdated} productos, ${saleCentersSynced} centros`,
      })

      // ── Fase 3: Matching productos → recetas ──────────────
      const phase3Start = Date.now()
      onProgress?.("matching", "Vinculando productos con recetas...")

      if (!dryRun) {
        matchedRecipes = await matchProductsToRecipes(log)
      }

      phases.push({
        name: "matching",
        duration: Date.now() - phase3Start,
        detail: `${matchedRecipes} productos vinculados a recetas`,
      })
    }

    // ── Fase 4: Sync Ventas ──────────────────────────────────
    if (syncType === "sales" || syncType === "full") {
      // Delay entre fases
      await agoraDelay()
      const phase4Start = Date.now()

      // Si no tenemos familyMap (sync solo ventas), descargarlo
      if (familyMap.size === 0) {
        const masterResult = await fetchAgoraMaster("Families")
        families = (masterResult.data.Families ?? []) as AgoraFamilyExport[]
        familyMap = buildFamilyMap(families)
      }

      const dateStart = options.dateStart ?? todayStr()
      const dateEnd = options.dateEnd ?? todayStr()
      const days = generateDateRange(dateStart, dateEnd)
      log(`Sincronizando ventas: ${days.length} días (${dateStart} → ${dateEnd})`)
      onProgress?.("sales", `Sincronizando ${days.length} días de ventas...`)

      // Cargar mapa WorkplaceId → RestaurantLocationId
      const locations = await prisma.restaurantLocation.findMany({
        where: { agoraPosId: { not: null } },
        select: { id: true, agoraPosId: true },
      })
      const workplaceToLocation = new Map<number, string>()
      for (const loc of locations) {
        if (loc.agoraPosId !== null) {
          workplaceToLocation.set(loc.agoraPosId, loc.id)
        }
      }

      for (let i = 0; i < days.length; i++) {
        const day = days[i]
        try {
          onProgress?.(
            "sales",
            `Día ${i + 1}/${days.length}: ${day}`
          )

          const salesResult = await fetchAgoraSales(day, "Invoices,PosCloseOuts")
          // Normalizar respuesta de Agora (estructura anidada → plana)
          const invoices = normalizeAgoraInvoices(salesResult.data.Invoices ?? [])
          const closeOuts = normalizeAgoraPosCloseOuts(salesResult.data.PosCloseOuts ?? [])

          if (invoices.length === 0 && closeOuts.length === 0) {
            log(`  ${day}: sin datos`)
            continue
          }

          log(`  ${day}: ${invoices.length} facturas, ${closeOuts.length} cierres`)

          // Agrupar facturas por WorkplaceId → mapa directo a RestaurantLocation
          const byLocation = new Map<string, { invoices: AgoraInvoiceExport[], closeOuts: AgoraPosCloseOutExport[] }>()
          // Mapa PosId → locationId inferido desde facturas (cada factura tiene PosId + WorkplaceId)
          const posToLocation = new Map<number, string>()

          for (const inv of invoices) {
            const wpId = inv.WorkplaceId
            if (!wpId) {
              log(`  Advertencia: factura ${inv.Serie}-${inv.Number} sin WorkplaceId`)
              continue
            }
            const locationId = workplaceToLocation.get(wpId)
            if (!locationId) {
              log(`  Advertencia: WorkplaceId=${wpId} sin RestaurantLocation vinculado`)
              continue
            }
            const entry = byLocation.get(locationId) ?? { invoices: [], closeOuts: [] }
            entry.invoices.push(inv)
            byLocation.set(locationId, entry)

            // Registrar PosId → locationId para asignar closeOuts
            if (inv.PosId) posToLocation.set(inv.PosId, locationId)
          }

          // Asignar cierres de caja por PosId → locationId (inferido de facturas)
          for (const co of closeOuts) {
            const locationId = posToLocation.get(co.PosId)
            if (!locationId) continue
            const entry = byLocation.get(locationId)
            if (entry) entry.closeOuts.push(co)
          }

          // Crear/actualizar snapshot por restaurante
          for (const [locationId, data] of byLocation) {
            await upsertSnapshot(
              locationId,
              day,
              data.invoices,
              data.closeOuts,
              familyMap,
              dryRun,
              log,
              { created: (n) => (snapshotsCreated += n), updated: (n) => (snapshotsUpdated += n) }
            )
          }

          // Rate limiting conservador
          if (i < days.length - 1) {
            await agoraDelay()
          }
        } catch (err) {
          const msg = `Error en día ${day}: ${err instanceof Error ? err.message : String(err)}`
          errors.push(msg)
          log(`  ${msg}`)
        }
      }

      phases.push({
        name: "sales",
        duration: Date.now() - phase4Start,
        detail: `${days.length} días → ${snapshotsCreated} creados, ${snapshotsUpdated} actualizados`,
      })
    }

    // ── Finalizar log ────────────────────────────────────────
    const durationMs = Date.now() - start
    if (syncLog && !dryRun) {
      await prisma.agoraSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
          snapshotsCreated,
          snapshotsUpdated,
          productsCreated,
          productsUpdated,
          errors: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
          durationMs,
          finishedAt: new Date(),
        },
      })
    }

    return {
      syncType,
      phases,
      snapshotsCreated,
      snapshotsUpdated,
      productsCreated,
      productsUpdated,
      familiesSynced,
      saleCentersSynced,
      matchedRecipes,
      errors,
      durationMs,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    errors.push(errorMsg)

    if (syncLog && !dryRun) {
      await prisma.agoraSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          errors: JSON.parse(JSON.stringify(errors)),
          durationMs: Date.now() - start,
          finishedAt: new Date(),
        },
      }).catch(() => {})
    }

    return {
      syncType,
      phases,
      snapshotsCreated,
      snapshotsUpdated,
      productsCreated,
      productsUpdated,
      familiesSynced,
      saleCentersSynced,
      matchedRecipes,
      errors,
      durationMs: Date.now() - start,
    }
  }
}

// ─── Sub-funciones ─────────────────────────────────────────────

async function syncWorkplaces(
  workplaces: AgoraWorkplaceExport[],
  log: (msg: string) => void
): Promise<number> {
  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true },
    select: { id: true, name: true, agoraPosId: true },
  })

  let synced = 0
  for (const wp of workplaces) {
    // Buscar por agoraPosId existente (Workplace.Id)
    let location = locations.find((l) => l.agoraPosId === wp.Id)
    if (!location) {
      // Matching por nombre normalizado
      const normalizedWpName = normalize(wp.Name)
      location = locations.find((l) => {
        const normalizedLName = normalize(l.name)
        return (
          normalizedLName === normalizedWpName ||
          normalizedLName.includes(normalizedWpName) ||
          normalizedWpName.includes(normalizedLName)
        )
      })
    }

    if (location && location.agoraPosId !== wp.Id) {
      await prisma.restaurantLocation.update({
        where: { id: location.id },
        data: { agoraPosId: wp.Id },
      })
      log(`  Workplace "${wp.Name}" vinculado a "${location.name}" (agoraPosId=${wp.Id})`)
      synced++
    } else if (location) {
      synced++
    } else {
      log(`  Workplace "${wp.Name}" (Id=${wp.Id}) sin restaurante coincidente`)
    }
  }

  return synced
}

async function syncProducts(
  products: AgoraProductExport[],
  families: AgoraFamilyExport[],
  log: (msg: string) => void
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  // Batch de 50
  for (let i = 0; i < products.length; i += 50) {
    const batch = products.slice(i, i + 50)
    const operations = batch.map((raw) => {
      const mapped = mapAgoraProduct(raw, families)
      return prisma.agoraProduct.upsert({
        where: { agoraId: mapped.agoraId },
        create: mapped,
        update: {
          name: mapped.name,
          familyId: mapped.familyId,
          familyName: mapped.familyName,
          mainPrice: mapped.mainPrice,
          costPrice: mapped.costPrice,
          barcode: mapped.barcode,
          isActive: mapped.isActive,
          syncedAt: new Date(),
        },
      })
    })

    const results = await prisma.$transaction(operations)

    // Contar creados vs actualizados
    for (const result of results) {
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++
      } else {
        updated++
      }
    }
  }

  log(`  Productos: ${created} creados, ${updated} actualizados`)
  return { created, updated }
}

async function matchProductsToRecipes(
  log: (msg: string) => void
): Promise<number> {
  // Cargar productos sin receta vinculada
  const unmatched = await prisma.agoraProduct.findMany({
    where: { recipeId: null, isActive: true },
    select: { id: true, name: true },
  })

  if (unmatched.length === 0) {
    log("  No hay productos sin vincular")
    return 0
  }

  // Cargar recetas
  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true },
  })

  // Crear mapa normalizado de recetas
  const recipeMap = new Map<string, string>() // normalized name → recipe id
  for (const r of recipes) {
    recipeMap.set(normalize(r.name), r.id)
  }

  let matched = 0
  for (const prod of unmatched) {
    const normalizedProd = normalize(prod.name)

    // Match exacto por nombre normalizado
    const recipeId = recipeMap.get(normalizedProd)
    if (recipeId) {
      await prisma.agoraProduct.update({
        where: { id: prod.id },
        data: { recipeId },
      })
      matched++
      continue
    }

    // Match por contención: el nombre del producto contiene el de la receta o viceversa
    for (const [recipeName, rId] of recipeMap) {
      if (
        normalizedProd.includes(recipeName) ||
        recipeName.includes(normalizedProd)
      ) {
        // Solo si la diferencia de longitud no es excesiva (evitar falsos positivos)
        const lenRatio = Math.min(normalizedProd.length, recipeName.length) /
          Math.max(normalizedProd.length, recipeName.length)
        if (lenRatio > 0.5) {
          await prisma.agoraProduct.update({
            where: { id: prod.id },
            data: { recipeId: rId },
          })
          matched++
          break
        }
      }
    }
  }

  log(`  Matching: ${matched}/${unmatched.length} productos vinculados a recetas`)
  return matched
}


async function upsertSnapshot(
  locationId: string,
  day: string,
  invoices: AgoraInvoiceExport[],
  closeOuts: AgoraPosCloseOutExport[],
  familyMap: Map<number, string>,
  dryRun: boolean,
  log: (msg: string) => void,
  counters: { created: (n: number) => void; updated: (n: number) => void }
) {
  const agg = aggregateInvoicesToSnapshot(invoices, closeOuts, familyMap)

  if (dryRun) {
    log(`    [dry-run] ${day}: ${agg.totalInvoices} facturas, €${agg.totalAmount}`)
    return
  }

  const businessDay = new Date(day + "T00:00:00Z")

  const existing = await prisma.agoraSalesSnapshot.findUnique({
    where: {
      restaurantLocationId_businessDay: {
        restaurantLocationId: locationId,
        businessDay,
      },
    },
    select: { id: true },
  })

  const snapshotData = {
    totalInvoices: agg.totalInvoices,
    totalGrossAmount: agg.totalGrossAmount,
    totalNetAmount: agg.totalNetAmount,
    totalAmount: agg.totalAmount,
    totalGuests: agg.totalGuests,
    avgTicket: agg.avgTicket,
    avgSpendPerGuest: agg.avgSpendPerGuest,
    salesByFamily: JSON.parse(JSON.stringify(agg.salesByFamily)),
    salesByPaymentMethod: JSON.parse(JSON.stringify(agg.salesByPaymentMethod)),
    salesByHour: JSON.parse(JSON.stringify(agg.salesByHour)),
    topProducts: JSON.parse(JSON.stringify(agg.topProducts)),
    taxBreakdown: JSON.parse(JSON.stringify(agg.taxBreakdown)),
    cashExpected: agg.cashExpected,
    cashReal: agg.cashReal,
    cashDifference: agg.cashDifference,
    syncedAt: new Date(),
  }

  if (existing) {
    await prisma.agoraSalesSnapshot.update({
      where: { id: existing.id },
      data: snapshotData,
    })
    counters.updated(1)
  } else {
    await prisma.agoraSalesSnapshot.create({
      data: {
        restaurantLocationId: locationId,
        businessDay,
        ...snapshotData,
      },
    })
    counters.created(1)
  }
}

// ─── Helpers ───────────────────────────────────────────────────


function generateDateRange(start: string, end: string): string[] {
  const days: string[] = []
  const current = new Date(start + "T00:00:00Z")
  const last = new Date(end + "T00:00:00Z")

  while (current <= last) {
    days.push(current.toISOString().split("T")[0])
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return days
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

