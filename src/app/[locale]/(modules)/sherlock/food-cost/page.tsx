import { getTranslations } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"
import { Header } from "@/components/layout/header"
import { getRestaurantLocations } from "@/modules/analytics/actions/cover-analytics"
import { FoodCostDashboard } from "./_components/food-cost-dashboard"

export default async function FoodCostPage() {
  await requirePermission("sherlock", "read")
  const t = await getTranslations("sherlock.foodCost")

  const locations = await getRestaurantLocations()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sherlock.foodCost.title"
        descriptionKey="sherlock.foodCost.description"
        backHref="/sherlock"
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <FoodCostDashboard locations={locations} />
      </div>
    </div>
  )
}
