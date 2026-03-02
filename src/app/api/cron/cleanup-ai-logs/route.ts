import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withProcessTracking } from "@/lib/process-runner"
import { ProcessTriggerType } from "@prisma/client"

/**
 * Limpia logs de uso de IA con más de 30 días de antigüedad.
 * Protegido con CRON_SECRET. Ejecutable desde Vercel Cron semanalmente.
 *
 * GET /api/cron/cleanup-ai-logs
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const { result } = await withProcessTracking(
      "cleanup-ai-logs",
      ProcessTriggerType.CRON,
      "api-cron",
      async () => {
        const days = 30
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const deleted = await prisma.aiUsageLog.deleteMany({
          where: { createdAt: { lt: cutoff } },
        })
        return { deleted: deleted.count, days, cutoffDate: cutoff.toISOString() }
      }
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[cron/cleanup-ai-logs] Error:", error)
    return NextResponse.json({ error: "Error during AI logs cleanup" }, { status: 500 })
  }
}
