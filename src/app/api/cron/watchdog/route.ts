import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProcessRunStatus } from "@prisma/client"

export const maxDuration = 30

const STALE_THRESHOLD_MS = 30 * 60 * 1000 // 30 min

/**
 * Watchdog genérico: limpia ProcessRuns atascados en RUNNING >30 min.
 * Corre cada 15 min via Vercel Cron.
 *
 * GET /api/cron/watchdog
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const staleRuns = await prisma.processRun.findMany({
      where: {
        status: ProcessRunStatus.RUNNING,
        startedAt: { lt: new Date(Date.now() - STALE_THRESHOLD_MS) },
      },
    })

    let cleaned = 0

    for (const run of staleRuns) {
      const minutes = Math.round((Date.now() - run.startedAt.getTime()) / 60000)
      const phases = (run.phases as unknown[] | null) ?? []

      await prisma.processRun.update({
        where: { id: run.id },
        data: {
          status: ProcessRunStatus.FAILED,
          finishedAt: new Date(),
          durationMs: Date.now() - run.startedAt.getTime(),
          error: `Watchdog: "${run.processSlug}" atascado ${minutes} min sin completar (${phases.length} fases completadas). Marcado como FAILED.`,
        },
      })

      console.log(`[watchdog] Limpiado run ${run.id} (${run.processSlug}, ${minutes} min atascado, ${phases.length} fases)`)
      cleaned++
    }

    return NextResponse.json({
      success: true,
      cleaned,
      checked: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[watchdog] Error:", error)
    return NextResponse.json({ error: "Watchdog error" }, { status: 500 })
  }
}
