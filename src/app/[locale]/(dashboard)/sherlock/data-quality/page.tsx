import { requirePermission } from "@/lib/actions/rbac"
import { Header } from "@/components/layout/header"
import { DataQualityDashboard } from "./_components/data-quality-dashboard"

export default async function DataQualityPage() {
  await requirePermission("sherlock", "read")

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sherlock.dataQuality.title"
        descriptionKey="sherlock.dataQuality.description"
        backHref="/sherlock"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
          <DataQualityDashboard />
        </div>
      </div>
    </div>
  )
}
