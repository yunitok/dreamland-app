import { requirePermission } from "@/lib/actions/rbac"

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('analytics', 'read')
  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  )
}
