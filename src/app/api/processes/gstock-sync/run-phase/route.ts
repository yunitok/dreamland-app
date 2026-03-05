import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProcessRunStatus, Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { createNotificationsForPermission } from "@/lib/notification-service"
import type { SyncOptions } from "@/modules/sherlock/domain/gstock-sync/sync-orchestrator"
import type { SyncPhaseResult } from "@/modules/sherlock/domain/gstock-sync/types"
import type { GstockIdMap } from "@/modules/sherlock/domain/gstock-sync/mappers"

export const maxDuration = 300

// ─── Configuración de fases ──────────────────────────────────

const PHASE_NAMES = [
  "measure-units",
  "categories",
  "recipe-categories",
  "recipe-families",
  "suppliers",
  "ingredients",
  "recipes",
  "knowledge-base",
] as const

type PhaseName = (typeof PHASE_NAMES)[number]

interface PhaseRequest {
  runId: string
  phase: number
  options: { dryRun?: boolean; skipKb?: boolean }
  maps: Record<string, Record<string, string>>
}

// ─── Serialización de mapas ──────────────────────────────────

function serializeIdMap(map: GstockIdMap): Record<string, string> {
  return Object.fromEntries(map)
}

function deserializeIdMap(obj?: Record<string, string>): GstockIdMap {
  return new Map(Object.entries(obj ?? {}))
}

// ─── Ejecutor de fase ────────────────────────────────────────

async function executePhase(
  phaseName: PhaseName,
  options: SyncOptions,
  maps: Record<string, Record<string, string>>
): Promise<{ result: SyncPhaseResult; newMaps: Record<string, Record<string, string>> }> {
  const {
    syncMeasureUnits,
    syncCategories,
    syncRecipeCategories,
    syncRecipeFamilies,
    syncSuppliers,
    syncIngredients,
    syncRecipes,
    syncKnowledgeBase,
  } = await import("@/modules/sherlock/domain/gstock-sync/sync-orchestrator")

  const newMaps: Record<string, Record<string, string>> = {}

  switch (phaseName) {
    case "measure-units": {
      const [result, unitMap] = await syncMeasureUnits(options)
      newMaps.unitMap = serializeIdMap(unitMap)
      return { result, newMaps }
    }
    case "categories": {
      const [result, categoryMap] = await syncCategories(options)
      newMaps.categoryMap = serializeIdMap(categoryMap)
      return { result, newMaps }
    }
    case "recipe-categories": {
      const [result, recipeCategoryMap] = await syncRecipeCategories(options)
      newMaps.recipeCategoryMap = serializeIdMap(recipeCategoryMap)
      return { result, newMaps }
    }
    case "recipe-families": {
      const [result, familyMap] = await syncRecipeFamilies(options)
      newMaps.familyMap = serializeIdMap(familyMap)
      return { result, newMaps }
    }
    case "suppliers": {
      const [result, supplierMap] = await syncSuppliers(options)
      newMaps.supplierMap = serializeIdMap(supplierMap)
      return { result, newMaps }
    }
    case "ingredients": {
      const unitMap = deserializeIdMap(maps.unitMap)
      const categoryMap = deserializeIdMap(maps.categoryMap)
      const supplierMap = deserializeIdMap(maps.supplierMap)
      const [result, ingredientMap, ingredientNameMap, productUnitMap] =
        await syncIngredients(unitMap, categoryMap, supplierMap, options)
      newMaps.ingredientMap = serializeIdMap(ingredientMap)
      newMaps.ingredientNameMap = Object.fromEntries(ingredientNameMap)
      newMaps.productUnitMap = serializeIdMap(productUnitMap)
      return { result, newMaps }
    }
    case "recipes": {
      const recipeCategoryMap = deserializeIdMap(maps.recipeCategoryMap)
      const familyMap = deserializeIdMap(maps.familyMap)
      const ingredientMap = deserializeIdMap(maps.ingredientMap)
      const productUnitMap = deserializeIdMap(maps.productUnitMap)
      const ingredientNameMap = new Map(Object.entries(maps.ingredientNameMap ?? {}))
      const result = await syncRecipes(
        recipeCategoryMap, familyMap, ingredientMap, productUnitMap, ingredientNameMap, options
      )
      return { result, newMaps }
    }
    case "knowledge-base": {
      const [result] = await syncKnowledgeBase(options)
      return { result, newMaps }
    }
  }
}

// ─── Handler principal ───────────────────────────────────────
// Ejecuta TODAS las fases restantes en una sola invocación (sin encadenamiento HTTP).
// Con las optimizaciones de batch, el total cabe sobradamente en maxDuration (120s).

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: PhaseRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { runId, phase, options, maps: initialMaps } = body

  if (!runId || phase == null || phase < 0 || phase >= PHASE_NAMES.length) {
    return NextResponse.json({ error: "Invalid runId or phase" }, { status: 400 })
  }

  // Verificar que el run no fue cancelado
  const run = await prisma.processRun.findUnique({
    where: { id: runId },
    select: { status: true, phases: true },
  })

  if (!run || run.status === ProcessRunStatus.CANCELLED || run.status === ProcessRunStatus.FAILED) {
    return NextResponse.json({ error: "Run cancelled, failed or not found" }, { status: 409 })
  }

  const syncOptions: SyncOptions = {
    dryRun: options?.dryRun ?? false,
    skipKB: options?.skipKb ?? false,
  }

  // Determinar última fase (saltar KB si skipKb)
  const lastPhase = syncOptions.skipKB ? PHASE_NAMES.length - 2 : PHASE_NAMES.length - 1

  const allPhases = (run.phases as unknown[] | null) ?? []
  let mergedMaps = { ...initialMaps }

  try {
    // Ejecutar todas las fases restantes secuencialmente en esta invocación
    for (let currentPhase = phase; currentPhase <= lastPhase; currentPhase++) {
      // Verificar cancelación entre fases
      if (currentPhase > phase) {
        const freshRun = await prisma.processRun.findUnique({
          where: { id: runId },
          select: { status: true },
        })
        if (!freshRun || freshRun.status === ProcessRunStatus.CANCELLED || freshRun.status === ProcessRunStatus.FAILED) {
          console.log(`[gstock-sync] Run cancelado/fallido durante ejecución, deteniendo en fase ${currentPhase}`)
          return NextResponse.json({ success: false, error: "Run cancelled during execution" }, { status: 409 })
        }
      }

      const phaseName = PHASE_NAMES[currentPhase]
      console.log(`[gstock-sync] Ejecutando fase ${currentPhase}/${lastPhase}: ${phaseName}`)

      const { result, newMaps } = await executePhase(phaseName, syncOptions, mergedMaps)

      allPhases.push(result)
      mergedMaps = { ...mergedMaps, ...newMaps }

      // Guardar progreso de fase en ProcessRun (permite ver avance en la UI)
      await prisma.processRun.update({
        where: { id: runId },
        data: { phases: allPhases as unknown as Prisma.InputJsonValue },
      })

      console.log(`[gstock-sync] Fase ${currentPhase} completada: ${result.created} creados, ${result.updated} actualizados (${result.durationMs}ms)`)
    }

    // Todas las fases completadas: finalizar el run
    const phaseResults = allPhases as SyncPhaseResult[]
    const totalDuration = phaseResults.reduce((sum, p) => sum + p.durationMs, 0)
    const totalErrors = phaseResults.flatMap((p) => p.errors)
    const totalCreated = phaseResults.reduce((sum, p) => sum + p.created, 0)
    const totalUpdated = phaseResults.reduce((sum, p) => sum + p.updated, 0)

    console.log(`[gstock-sync] Todas las fases completadas: ${totalCreated} creados, ${totalUpdated} actualizados, ${totalErrors.length} errores (${totalDuration}ms)`)

    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: totalErrors.length > 0 ? ProcessRunStatus.FAILED : ProcessRunStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs: totalDuration,
        output: {
          message: `${phaseResults.length} fases completadas: ${totalCreated} creados, ${totalUpdated} actualizados`,
          totalCreated,
          totalUpdated,
          errors: totalErrors,
        } as unknown as Prisma.InputJsonValue,
        error: totalErrors.length > 0 ? totalErrors.join("; ").slice(0, 500) : null,
      },
    })

    revalidatePath("/admin/processes")

    if (totalErrors.length > 0) {
      await notifyAdminsOnFailure(runId, totalErrors)
    }

    return NextResponse.json({
      success: true,
      phasesCompleted: phaseResults.length,
      totalCreated,
      totalUpdated,
      totalErrors: totalErrors.length,
      durationMs: totalDuration,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[gstock-sync] Fatal error:`, err)
    await safeFinalize(runId, "FAILED", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Finaliza un run de forma segura. Si la DB falla, solo loguea.
 */
async function safeFinalize(runId: string, status: "SUCCESS" | "FAILED", error?: string) {
  try {
    const run = await prisma.processRun.findUnique({
      where: { id: runId },
      select: { phases: true, startedAt: true },
    })
    if (!run) return

    const phases = (run.phases as SyncPhaseResult[] | null) ?? []
    const totalDuration = phases.reduce((sum, p) => sum + p.durationMs, 0)

    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: status === "FAILED" ? ProcessRunStatus.FAILED : ProcessRunStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs: totalDuration,
        error: error?.slice(0, 500) ?? null,
      },
    })

    revalidatePath("/admin/processes")

    if (status === "FAILED") {
      await notifyAdminsOnFailure(runId, error ? [error] : [])
    }
  } catch (dbErr) {
    console.error(`[gstock-sync] DOBLE FALLO al finalizar run ${runId}:`, dbErr)
  }
}

async function notifyAdminsOnFailure(runId: string, errors: string[]) {
  try {
    await createNotificationsForPermission("admin", "manage", {
      type: "PROCESS_FAILED",
      title: "Sincronización GStock fallida",
      body: errors[0] ?? "Error desconocido durante la sincronización",
      href: `/admin/processes/gstock-sync`,
    })
  } catch (err) {
    console.error("[gstock-sync] Error notifying admins:", err)
  }
}
