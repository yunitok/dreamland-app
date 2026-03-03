import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProcessRunStatus, ProcessTriggerType } from "@prisma/client"

/**
 * Inicia la sincronización GStock → Sherlock → RAG (8 fases encadenadas).
 * Protegido con CRON_SECRET. Ejecutable desde Vercel Cron diariamente.
 *
 * La ruta crea un ProcessRun y dispara la primera fase. Las fases se encadenan
 * automáticamente via /api/processes/gstock-sync/run-phase.
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
    // ── Watchdog: limpiar runs huérfanos (>30 min en RUNNING) ──
    const STALE_THRESHOLD_MS = 30 * 60 * 1000
    const staleRuns = await prisma.processRun.findMany({
      where: {
        processSlug: "gstock-sync",
        status: ProcessRunStatus.RUNNING,
        startedAt: { lt: new Date(Date.now() - STALE_THRESHOLD_MS) },
      },
    })

    for (const stale of staleRuns) {
      await prisma.processRun.update({
        where: { id: stale.id },
        data: {
          status: ProcessRunStatus.FAILED,
          finishedAt: new Date(),
          durationMs: Date.now() - stale.startedAt.getTime(),
          error: `Watchdog: proceso atascado sin completar tras ${Math.round((Date.now() - stale.startedAt.getTime()) / 60000)} min. Marcado como FAILED automáticamente.`,
        },
      })
      console.log(`[cron/gstock-sync] Watchdog: run ${stale.id} marcado como FAILED (${Math.round((Date.now() - stale.startedAt.getTime()) / 60000)} min atascado)`)
    }

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

    // ── Crear run y disparar primera fase ──
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

    fetch(`${baseUrl}/api/processes/gstock-sync/run-phase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${expectedSecret}`,
      },
      body: JSON.stringify({ runId: run.id, phase: 0, options: {}, maps: {} }),
    }).catch(async (err) => {
      console.error("[cron/gstock-sync] Error starting chain:", err)
      await prisma.processRun.update({
        where: { id: run.id },
        data: {
          status: ProcessRunStatus.FAILED,
          finishedAt: new Date(),
          durationMs: Date.now() - run.startedAt.getTime(),
          error: `Error iniciando cadena de fases: ${err instanceof Error ? err.message : String(err)}`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      runId: run.id,
      message: `Sincronización GStock iniciada (8 fases encadenadas)${staleRuns.length > 0 ? `. Watchdog limpió ${staleRuns.length} run(s) huérfano(s).` : ""}`,
    })
  } catch (error) {
    console.error("[cron/gstock-sync] Error:", error)
    return NextResponse.json({ error: "Error starting GStock sync" }, { status: 500 })
  }
}
