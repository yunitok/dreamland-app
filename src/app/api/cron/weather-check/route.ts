import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkAllLocationsWeather } from "@/lib/weather"
import { withProcessTracking } from "@/lib/process-runner"
import { createNotificationsForPermission } from "@/lib/notification-service"
import { ProcessTriggerType } from "@prisma/client"

/**
 * Consulta AEMET/OWM para ubicaciones activas y crea alertas meteorológicas.
 * Protegido con CRON_SECRET. Ejecutable desde Vercel Cron diariamente a las 8:00 UTC.
 *
 * GET /api/cron/weather-check
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
      "weather-check",
      ProcessTriggerType.CRON,
      "api-cron",
      async () => {
        const locations = await prisma.restaurantLocation.findMany({
          where: { isActive: true },
          select: { city: true, aemetMunicipioId: true, latitude: true, longitude: true },
        })

        if (locations.length === 0) {
          return { message: "No hay ubicaciones activas", locationsChecked: 0, totalAlertsCreated: 0 }
        }

        const weatherResult = await checkAllLocationsWeather(locations, prisma)

        // Notificar si se crearon alertas
        if (weatherResult.totalAlertsCreated > 0) {
          const affectedCities = weatherResult.forecasts
            .filter((f) => f.alertsGenerated > 0)
            .map((f) => f.city)
            .join(", ")

          await createNotificationsForPermission("atc", "read", {
            type: "WEATHER_ALERT",
            title: `${weatherResult.totalAlertsCreated} alerta(s) meteorológica(s)`,
            body: affectedCities,
            href: "/atc/operations",
          })
        }

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
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[cron/weather-check] Error:", error)
    return NextResponse.json({ error: "Error during weather check" }, { status: 500 })
  }
}
