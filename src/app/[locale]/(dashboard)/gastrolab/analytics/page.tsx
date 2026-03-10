import { requirePermission } from "@/lib/actions/rbac"
import { Header } from "@/components/layout/header"
import { AnalyticsDashboard } from "./_components/analytics-dashboard"
import { getRestaurantLocations } from "@/modules/gastrolab/actions/cover-analytics"

export default async function AnalyticsPage() {
  await requirePermission("gastrolab", "read")
  const locations = await getRestaurantLocations()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="gastrolab.analytics.title"
        descriptionKey="gastrolab.analytics.description"
        backHref="/gastrolab"
        backLabelKey="gastrolab.title"
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <AnalyticsDashboard locations={locations} />
      </div>
    </div>
  )
}
