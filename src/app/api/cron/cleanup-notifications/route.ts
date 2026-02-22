import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Limpia notificaciones con más de 30 días de antigüedad.
 * Protegido con CRON_SECRET. Ejecutable desde n8n o Vercel Cron.
 *
 * GET /api/cron/cleanup-notifications
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const result = await prisma.notification.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      cutoffDate: thirtyDaysAgo.toISOString(),
    })
  } catch (error) {
    console.error("[cron/cleanup-notifications] Error:", error)
    return NextResponse.json({ error: "Error during cleanup" }, { status: 500 })
  }
}
