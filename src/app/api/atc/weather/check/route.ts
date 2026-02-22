import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkAllLocationsWeather } from "@/lib/weather"
import { sendSlackNotification, sendEmailNotification } from "@/lib/notifications"
import { createNotificationsForPermission } from "@/lib/notification-service"

export async function POST(req: Request) {
  // Auth: cron secret o n8n secret
  const secret = req.headers.get("x-cron-secret") || req.headers.get("x-n8n-secret")
  const expectedSecret = process.env.CRON_SECRET || process.env.N8N_WEBHOOK_SECRET
  if (!secret || !expectedSecret || secret !== expectedSecret) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const locations = await prisma.restaurantLocation.findMany({
      where: { isActive: true },
      select: { city: true, aemetMunicipioId: true, latitude: true, longitude: true },
    })

    if (locations.length === 0) {
      return NextResponse.json({
        checked: true,
        message: "No hay ubicaciones activas configuradas",
        alertsCreated: 0,
      })
    }

    const result = await checkAllLocationsWeather(locations, prisma)

    // Notificaciones (fallan silenciosamente si no configuradas)
    if (result.totalAlertsCreated > 0) {
      const notifPayload = result.forecasts
        .filter(f => f.alertsGenerated > 0)
        .map((f, i) => ({
          id: `gen-${i}`,
          alertType: "WEATHER",
          severity: "HIGH",
          description: `[${f.city}] ${f.alertsGenerated} alerta(s) generada(s)`,
          forecastDate: new Date(),
        }))
      const affectedCities = result.forecasts
        .filter(f => f.alertsGenerated > 0)
        .map(f => f.city)
        .join(", ")

      await Promise.allSettled([
        sendSlackNotification(notifPayload),
        sendEmailNotification(notifPayload),
        createNotificationsForPermission("atc", "read", {
          type: "WEATHER_ALERT",
          title: `${result.totalAlertsCreated} alerta(s) meteorológica(s)`,
          body: affectedCities,
          href: "/atc/operations",
          metadata: { totalAlerts: result.totalAlertsCreated, source: "cron" },
        }),
      ])
    }

    return NextResponse.json({
      checked: true,
      locationsChecked: result.forecasts.length,
      totalAlertsCreated: result.totalAlertsCreated,
      summary: result.forecasts.map(f => ({
        city: f.city,
        source: f.source,
        forecastDays: f.days.length,
        alertsCreated: f.alertsGenerated,
      })),
    })
  } catch (error) {
    console.error("[weather/check] Error:", error)
    return NextResponse.json({ error: "Error checking weather" }, { status: 500 })
  }
}
