import { NextRequest, NextResponse } from "next/server"
import { withProcessTracking } from "@/lib/process-runner"
import { getProcessDefinition } from "@/modules/admin/domain/process-registry"
import { ProcessTriggerType } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/processes/[slug]/trigger
 *
 * Trigger externo para ejecutar un proceso. Usado por Vercel Cron o scripts externos.
 *
 * Headers: Authorization: Bearer CRON_SECRET
 * Body (opcional): { options?: Record<string, unknown> }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Autenticación
  const authHeader = request.headers.get("authorization")
  const expectedCron = process.env.CRON_SECRET

  if (!expectedCron || authHeader !== `Bearer ${expectedCron}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const definition = getProcessDefinition(slug)
  if (!definition) {
    return NextResponse.json({ error: `Unknown process: ${slug}` }, { status: 404 })
  }

  // Solo procesos internos pueden ejecutarse directo
  if (definition.executor !== "internal") {
    return NextResponse.json(
      { error: `Process "${slug}" uses executor "${definition.executor}" — use n8n or trigger externally` },
      { status: 400 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    // Body vacío es válido
  }

  try {
    const { runId, result } = await withProcessTracking(
      slug,
      ProcessTriggerType.CRON,
      "api-trigger",
      () => executeInternalProcess(slug, body.options as Record<string, unknown> | undefined),
      body.options as Record<string, unknown> | undefined
    )

    return NextResponse.json({ success: true, runId, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Ejecuta un proceso interno por su slug.
 * Cada proceso retorna un objeto con los resultados.
 */
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
      const { syncKnowledgeBaseOnly } = await import(
        "@/modules/gastrolab/domain/gstock-sync/sync-orchestrator"
      )
      return await syncKnowledgeBaseOnly()
    }

    case "weather-check": {
      const { checkAllLocationsWeather } = await import("@/lib/weather")
      const locations = await prisma.restaurantLocation.findMany({
        where: { isActive: true },
        select: { city: true, aemetMunicipioId: true, latitude: true, longitude: true },
      })
      if (locations.length === 0) {
        return { message: "No hay ubicaciones activas", locationsChecked: 0, totalAlertsCreated: 0 }
      }
      const weatherResult = await checkAllLocationsWeather(locations, prisma)
      return {
        message: `${weatherResult.forecasts.length} ubicaciones, ${weatherResult.totalAlertsCreated} alertas`,
        locationsChecked: weatherResult.forecasts.length,
        totalAlertsCreated: weatherResult.totalAlertsCreated,
      }
    }

    default:
      throw new Error(`No internal executor defined for process: ${slug}`)
  }
}
