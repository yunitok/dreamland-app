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
    const run = await prisma.processRun.create({
      data: {
        processSlug: "gstock-sync",
        status: ProcessRunStatus.RUNNING,
        triggerType: ProcessTriggerType.CRON,
        triggeredBy: "api-cron",
      },
    })

    // Determinar URL base para la llamada interna
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

    // Disparar fase 0 de forma asíncrona (las fases se encadenan solas)
    fetch(`${baseUrl}/api/processes/gstock-sync/run-phase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${expectedSecret}`,
      },
      body: JSON.stringify({ runId: run.id, phase: 0, options: {}, maps: {} }),
    }).catch((err) => console.error("[cron/gstock-sync] Error starting chain:", err))

    return NextResponse.json({
      success: true,
      runId: run.id,
      message: "Sincronización GStock iniciada (8 fases encadenadas)",
    })
  } catch (error) {
    console.error("[cron/gstock-sync] Error:", error)
    return NextResponse.json({ error: "Error starting GStock sync" }, { status: 500 })
  }
}
