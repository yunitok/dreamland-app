/**
 * Process Runner — wrapper genérico para tracking de procesos automáticos.
 *
 * Envuelve cualquier función de proceso con logging a ProcessRun (DB)
 * y notificaciones automáticas en caso de fallo.
 */

import { prisma } from "@/lib/prisma"
import { createNotificationsForPermission } from "@/lib/notification-service"
import { ProcessRunStatus, ProcessTriggerType, Prisma } from "@prisma/client"

export interface ProcessResult {
  [key: string]: unknown
}

/**
 * Ejecuta una función de proceso con tracking completo en DB.
 *
 * 1. Crea ProcessRun (RUNNING)
 * 2. Ejecuta fn()
 * 3. Actualiza ProcessRun (SUCCESS/FAILED + output/error)
 * 4. Si falla → notifica a SUPER_ADMIN
 */
export async function withProcessTracking<T extends ProcessResult>(
  slug: string,
  triggerType: ProcessTriggerType,
  triggeredBy: string | null,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ runId: string; result: T }> {
  const run = await prisma.processRun.create({
    data: {
      processSlug: slug,
      status: ProcessRunStatus.RUNNING,
      triggerType,
      triggeredBy,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })

  const startTime = Date.now()

  try {
    const result = await fn()
    const durationMs = Date.now() - startTime

    await prisma.processRun.update({
      where: { id: run.id },
      data: {
        status: ProcessRunStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs,
        output: result as unknown as Prisma.InputJsonValue,
      },
    })

    return { runId: run.id, result }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    await prisma.processRun.update({
      where: { id: run.id },
      data: {
        status: ProcessRunStatus.FAILED,
        finishedAt: new Date(),
        durationMs,
        error: errorMessage,
      },
    })

    // Notificar a administradores del fallo
    await createNotificationsForPermission("admin", "manage", {
      type: "PROCESS_FAILED",
      title: `Proceso fallido: ${slug}`,
      body: `El proceso "${slug}" ha fallado después de ${Math.round(durationMs / 1000)}s: ${errorMessage}`,
      href: `/admin/processes/${slug}`,
    })

    throw error
  }
}

/**
 * Registra un ProcessRun completado externamente (callback de n8n o GitHub Actions).
 */
export async function registerExternalRun(data: {
  runId?: string
  processSlug: string
  triggerType?: ProcessTriggerType
  triggeredBy?: string
  status: ProcessRunStatus
  startedAt?: Date
  durationMs?: number
  output?: Record<string, unknown>
  error?: string
  phases?: unknown[]
}): Promise<string> {
  // Si viene runId → actualizar run existente (trigger manual → callback)
  if (data.runId) {
    await prisma.processRun.update({
      where: { id: data.runId },
      data: {
        status: data.status,
        finishedAt: new Date(),
        durationMs: data.durationMs,
        output: (data.output ?? undefined) as Prisma.InputJsonValue | undefined,
        error: data.error,
        phases: (data.phases ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })

    // Notificar si falló
    if (data.status === ProcessRunStatus.FAILED) {
      await createNotificationsForPermission("admin", "manage", {
        type: "PROCESS_FAILED",
        title: `Proceso fallido: ${data.processSlug}`,
        body: data.error ?? "Error desconocido",
        href: `/admin/processes/${data.processSlug}`,
      })
    }

    return data.runId
  }

  // Sin runId → crear nuevo run (ejecución programada externa)
  const run = await prisma.processRun.create({
    data: {
      processSlug: data.processSlug,
      status: data.status,
      triggerType: data.triggerType ?? ProcessTriggerType.CRON,
      triggeredBy: data.triggeredBy,
      startedAt: data.startedAt ?? new Date(),
      finishedAt: new Date(),
      durationMs: data.durationMs,
      output: (data.output ?? undefined) as Prisma.InputJsonValue | undefined,
      error: data.error,
      phases: (data.phases ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })

  if (data.status === ProcessRunStatus.FAILED) {
    await createNotificationsForPermission("admin", "manage", {
      type: "PROCESS_FAILED",
      title: `Proceso fallido: ${data.processSlug}`,
      body: data.error ?? "Error desconocido",
      href: `/admin/processes/${data.processSlug}`,
    })
  }

  return run.id
}
