import { requirePermission } from "@/lib/actions/rbac"
import { Header } from "@/components/layout/header"
import { getRestaurantLocations } from "@/modules/analytics/actions/cover-analytics"
import { WasteAnalyticsDashboard } from "./_components/waste-analytics-dashboard"

export default async function WasteAnalyticsPage() {
  await requirePermission("sherlock", "read")
  const locations = await getRestaurantLocations()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sherlock.wasteAnalytics.title"
        descriptionKey="sherlock.wasteAnalytics.description"
        backHref="/sherlock"
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <WasteAnalyticsDashboard locations={locations} />
      </div>
    </div>
  )
}
