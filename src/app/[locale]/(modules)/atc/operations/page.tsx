import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getSession } from "@/lib/auth"
import { getIncidents, getWeatherAlerts, getRestaurantLocations, getWeatherConfig } from "@/modules/atc/actions/operations"
import { IncidentsTable } from "@/modules/atc/ui/operations/incidents-table"
import { IncidentDialog } from "@/modules/atc/ui/operations/incident-dialog"
import { WeatherAlertDialog } from "@/modules/atc/ui/operations/weather-alert-dialog"
import { WeatherForecastPanel } from "@/modules/atc/ui/operations/weather-forecast-panel"
import { WeatherConfigDialog } from "@/modules/atc/ui/operations/weather-config-dialog"
import { WeatherAlertsDashboard } from "@/modules/atc/ui/operations/weather-alerts-dashboard"

export default async function AtcOperationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const session = await getSession() as { user?: { role?: string } } | null
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  const [incidentsResult, alertsResult, locationsResult, configResult] = await Promise.all([
    getIncidents(),
    getWeatherAlerts(),
    getRestaurantLocations(),
    getWeatherConfig(),
  ])

  if (!incidentsResult.success) {
    return <div className="p-8">{t("errorLoading")}</div>
  }

  const weatherConfig = configResult.data ?? {
    rainProbability: 50, rainMm: 5, windSpeed: 40, windGust: 60,
    temperatureLow: 8, temperatureHigh: 36, serviceHoursStart: 12, serviceHoursEnd: 0,
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("operationsTitle")}
        description={t("operationsDescription")}
        backHref="/atc"
      >
        <IncidentDialog trigger={t("addIncident")} />
        <WeatherAlertDialog trigger={t("addWeatherAlert")} locations={locationsResult.data ?? []} />
        <WeatherConfigDialog config={weatherConfig} />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full">
        <Tabs defaultValue="incidents">
          <TabsList className="mb-6">
            <TabsTrigger value="incidents">{t("incidentsTab")}</TabsTrigger>
            <TabsTrigger value="weather">{t("weatherTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <Suspense fallback={<Skeleton className="h-100 w-full" />}>
              <IncidentsTable data={incidentsResult.data ?? []} isSuperAdmin={isSuperAdmin} />
            </Suspense>
          </TabsContent>

          <TabsContent value="weather">
            <div className="space-y-6">
              <WeatherForecastPanel />
              <Suspense fallback={<Skeleton className="h-100 w-full" />}>
                <WeatherAlertsDashboard data={alertsResult.data ?? []} isSuperAdmin={isSuperAdmin} />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
