import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProcessRunStatus, ProcessTriggerType } from "@prisma/client"

export const maxDuration = 60

/**
 * Inicia la sincronización GStock → Sherlock → RAG.
 * Protegido con CRON_SECRET. Ejecutable desde Vercel Cron diariamente.
 *
 * La ruta crea un ProcessRun y dispara run-phase via fire-and-forget.
 * run-phase ejecuta las 8 fases monolíticamente (maxDuration: 300s).
 *
 * Watchdog de runs huérfanos delegado a /api/cron/watchdog (cada 15 min).
 *
 * GET /api/cron/gstock-sync
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // ── Protección contra ejecución duplicada ──
    const activeRun = await prisma.processRun.findFirst({
      where: {
        processSlug: "gstock-sync",
        status: ProcessRunStatus.RUNNING,
      },
    })

    if (activeRun) {
      return NextResponse.json({
        success: false,
        error: "Ya hay una sincronización en curso",
        activeRunId: activeRun.id,
      }, { status: 409 })
    }

    // ── Crear run y disparar run-phase ──
    const run = await prisma.processRun.create({
      data: {
        processSlug: "gstock-sync",
        status: ProcessRunStatus.RUNNING,
        triggerType: ProcessTriggerType.CRON,
        triggeredBy: "api-cron",
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

    console.log(`[cron/gstock-sync] Iniciando run ${run.id} — fire-and-forget a run-phase`)

    // Fire-and-forget: run-phase es independiente (maxDuration: 300s).
    // Solo capturamos errores de conexión. El watchdog cubre runs huérfanos.
    fetch(`${baseUrl}/api/processes/gstock-sync/run-phase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${expectedSecret}`,
      },
      body: JSON.stringify({ runId: run.id, phase: 0, options: {}, maps: {} }),
    }).catch(async (err) => {
      console.error("[cron/gstock-sync] Error connecting to run-phase:", err)
      await safeMarkFailed(run.id, run.startedAt, `Error conectando: ${err instanceof Error ? err.message : String(err)}`)
    })

    return NextResponse.json({
      success: true,
      runId: run.id,
      message: "Sincronización GStock iniciada",
    })
  } catch (error) {
    console.error("[cron/gstock-sync] Error:", error)
    return NextResponse.json({ error: "Error starting GStock sync" }, { status: 500 })
  }
}

/**
 * Intenta marcar un run como FAILED de forma segura.
 * Si la DB también falla (cascada), solo loguea sin crashear.
 */
async function safeMarkFailed(runId: string, startedAt: Date, error: string) {
  try {
    await prisma.processRun.update({
      where: { id: runId },
      data: {
        status: ProcessRunStatus.FAILED,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        error: error.slice(0, 500),
      },
    })
    console.log(`[cron/gstock-sync] Run ${runId} marcado como FAILED`)
  } catch (dbErr) {
    console.error(`[cron/gstock-sync] DOBLE FALLO: no se pudo marcar run ${runId} como FAILED:`, dbErr)
  }
}
