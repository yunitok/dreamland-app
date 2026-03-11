import { requirePermission } from "@/lib/actions/rbac"

export default async function SherlockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('sherlock', 'read')
  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  )
}
