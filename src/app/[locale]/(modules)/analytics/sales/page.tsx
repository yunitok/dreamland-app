import { requirePermission } from "@/lib/actions/rbac"
import { Header } from "@/components/layout/header"
import { SalesDashboard } from "./_components/sales-dashboard"
import { getAgoraRestaurantLocations } from "@/modules/analytics/actions/agora-analytics"

export default async function SalesPage() {
  await requirePermission("analytics", "read")
  const locations = await getAgoraRestaurantLocations()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="analytics.sales.title"
        descriptionKey="analytics.sales.description"
        backHref="/analytics"
        backLabelKey="analytics.title"
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <SalesDashboard locations={locations} />
      </div>
    </div>
  )
}
