"use server"

import { requirePermission } from "@/lib/actions/rbac"
import { prisma } from "@/lib/prisma"
import { withProcessTracking } from "@/lib/process-runner"
import { getProcessDefinition, PROCESS_DEFINITIONS } from "@/modules/admin/domain/process-registry"
import { ProcessRunStatus, ProcessTriggerType, Prisma } from "@prisma/client"
import { getSession } from "@/lib/auth"

// ─── Helpers ─────────────────────────────────────────────────

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

// ─── Tipos ────────────────────────────────────────────────────

export interface ProcessDashboardItem {
  slug: string
  lastRun: {
    id: string
    status: ProcessRunStatus
    triggerType: ProcessTriggerType
    startedAt: string
    durationMs: number | null
    output: Record<string, unknown> | null
    error: string | null
  } | null
  runningNow: boolean
  activeRunId: string | null
}

export interface ProcessHistoryRun {
  id: string
  status: ProcessRunStatus
  triggerType: ProcessTriggerType
  triggeredBy: string | null
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  output: Record<string, unknown> | null
  error: string | null
  phases: unknown[] | null
}

// ─── Dashboard ────────────────────────────────────────────────

export async function getProcessDashboard(): Promise<ProcessDashboardItem[]> {
  await requirePermission("admin", "manage")

  const slugs = PROCESS_DEFINITIONS.map((p) => p.slug)

  // Obtener último run de cada proceso + si hay alguno RUNNING
  const [lastRuns, runningRuns] = await Promise.all([
    // Último run por slug (usamos raw query para eficiencia)
    prisma.processRun.findMany({
      where: { processSlug: { in: slugs } },
      orderBy: { startedAt: "desc" },
      distinct: ["processSlug"],
      select: {
        id: true,
        processSlug: true,
        status: true,
        triggerType: true,
        startedAt: true,
        durationMs: true,
        output: true,
        error: true,
      },
    }),
    prisma.processRun.findMany({
      where: {
        processSlug: { in: slugs },
        status: { in: [ProcessRunStatus.PENDING, ProcessRunStatus.RUNNING] },
      },
      select: { id: true, processSlug: true },
    }),
  ])

  const lastRunMap = new Map(lastRuns.map((r) => [r.processSlug, r]))
  const activeRunMap = new Map(runningRuns.map((r) => [r.processSlug, r.id]))

  return slugs.map((slug) => {
    const run = lastRunMap.get(slug)
    return {
      slug,
      lastRun: run
        ? {
            id: run.id,
            status: run.status,
            triggerType: run.triggerType,
            startedAt: run.startedAt.toISOString(),
            durationMs: run.durationMs,
            output: run.output as Record<string, unknown> | null,
            error: run.error,
          }
        : null,
      runningNow: activeRunMap.has(slug),
      activeRunId: activeRunMap.get(slug) ?? null,
    }
  })
}

// ─── Trigger manual ───────────────────────────────────────────

export async function triggerProcess(
  slug: string,
  options?: Record<string, unknown>
): Promise<{ success: boolean; runId?: string; error?: string; result?: Record<string, unknown> }> {
  await requirePermission("admin", "manage")

  const definition = getProcessDefinition(slug)
  if (!definition) {
    return { success: false, error: `Proceso desconocido: ${slug}` }
  }

  const session = await getSession()
  const userId = session?.user?.id ?? "unknown"

  // Procesos external (GitHub Actions, etc.): registrar como PENDING
  if (definition.executor === "external") {
    const run = await prisma.processRun.create({
      data: {
        processSlug: slug,
        status: ProcessRunStatus.PENDING,
        triggerType: ProcessTriggerType.MANUAL,
        triggeredBy: userId,
        metadata: (options ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
    return {
      success: true,
      runId: run.id,
      result: { message: `Proceso "${definition.name}" registrado. Esperando ejecución por ${definition.executor}.` },
    }
  }

  // GStock sync: auto-encadenamiento por fases (cada fase < 60s, total ~8 min)
  if (slug === "gstock-sync") {
    const run = await prisma.processRun.create({
      data: {
        processSlug: slug,
        status: ProcessRunStatus.RUNNING,
        triggerType: ProcessTriggerType.MANUAL,
        triggeredBy: userId,
        metadata: (options ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })

    const baseUrl = getAppBaseUrl()
    fetch(`${baseUrl}/api/processes/gstock-sync/run-phase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ runId: run.id, phase: 0, options: options ?? {}, maps: {} }),
    }).catch(err => console.error("[gstock-sync] Error starting chain:", err))

    return {
      success: true,
      runId: run.id,
      result: { message: `Sincronización GStock iniciada (8 fases). Progreso visible en el detalle del proceso.` },
    }
  }

  // Procesos n8n: registrar como PENDING
  if (definition.executor === "n8n") {
    const run = await prisma.processRun.create({
      data: {
        processSlug: slug,
        status: ProcessRunStatus.PENDING,
        triggerType: ProcessTriggerType.MANUAL,
        triggeredBy: userId,
        metadata: (options ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
    return {
      success: true,
      runId: run.id,
      result: { message: `Proceso "${definition.name}" registrado. Esperando ejecución por n8n.` },
    }
  }

  // Procesos internos: ejecutar directamente
  try {
    const { runId, result } = await withProcessTracking(
      slug,
      ProcessTriggerType.MANUAL,
      userId,
      () => executeInternalProcess(slug, options),
      options
    )
    return { success: true, runId, result }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ─── Historial ────────────────────────────────────────────────

export async function getProcessHistory(
  slug: string,
  page = 1,
  pageSize = 20
): Promise<{ runs: ProcessHistoryRun[]; total: number }> {
  await requirePermission("admin", "manage")

  const [runs, total] = await Promise.all([
    prisma.processRun.findMany({
      where: { processSlug: slug },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        triggerType: true,
        triggeredBy: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        output: true,
        error: true,
        phases: true,
      },
    }),
    prisma.processRun.count({ where: { processSlug: slug } }),
  ])

  return {
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      triggerType: r.triggerType,
      triggeredBy: r.triggeredBy,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      output: r.output as Record<string, unknown> | null,
      error: r.error,
      phases: r.phases as unknown[] | null,
    })),
    total,
  }
}

// ─── Cancelar run ────────────────────────────────────────────

export async function cancelProcessRun(
  runId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("admin", "manage")

  const run = await prisma.processRun.findUnique({
    where: { id: runId },
    select: { id: true, status: true },
  })

  if (!run) {
    return { success: false, error: "Run no encontrado" }
  }

  if (run.status !== ProcessRunStatus.PENDING && run.status !== ProcessRunStatus.RUNNING) {
    return { success: false, error: `No se puede cancelar un run con estado ${run.status}` }
  }

  await prisma.processRun.update({
    where: { id: runId },
    data: {
      status: ProcessRunStatus.CANCELLED,
      finishedAt: new Date(),
      error: "Cancelado manualmente por el usuario",
    },
  })

  return { success: true }
}

// ─── Ejecutor interno ─────────────────────────────────────────

async function executeInternalProcess(
  slug: string,
  options?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (slug) {
    case "cleanup-notifications": {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const result = await prisma.notification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      return { deleted: result.count, cutoffDate: cutoff.toISOString() }
    }

    case "cleanup-ai-logs": {
      const days = (options?.days as number) ?? 30
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const result = await prisma.aiUsageLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      return { deleted: result.count, days, cutoffDate: cutoff.toISOString() }
    }

    case "kb-sync": {
      // Importar dinámicamente para evitar cargar todo el módulo en el bundle
      const { syncKnowledgeBaseOnly } = await import(
        "@/modules/sherlock/domain/gstock-sync/sync-orchestrator"
      )
      const result = await syncKnowledgeBaseOnly()
      return result
    }

    case "weather-check": {
      const { checkAllLocationsWeather } = await import("@/lib/weather")
      const locations = await prisma.restaurantLocation.findMany({
        where: { isActive: true },
        select: { city: true, aemetMunicipioId: true, latitude: true, longitude: true },
      })
      if (locations.length === 0) {
        return { message: "No hay ubicaciones activas configuradas", locationsChecked: 0, totalAlertsCreated: 0 }
      }
      const weatherResult = await checkAllLocationsWeather(locations, prisma)
      return {
        message: `${weatherResult.forecasts.length} ubicaciones consultadas, ${weatherResult.totalAlertsCreated} alertas creadas`,
        locationsChecked: weatherResult.forecasts.length,
        totalAlertsCreated: weatherResult.totalAlertsCreated,
        summary: weatherResult.forecasts.map((f) => ({
          city: f.city,
          source: f.source,
          forecastDays: f.days.length,
          alertsCreated: f.alertsGenerated,
        })),
      }
    }

    default:
      throw new Error(`No internal executor for: ${slug}`)
  }
}
