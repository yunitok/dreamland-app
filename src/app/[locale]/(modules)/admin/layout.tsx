import { requirePermission } from "@/lib/actions/rbac"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Strict permission check for admin section
  await requirePermission('admin', 'manage')

  return (
    <div className="flex flex-col w-full h-full">
      {/* Admin specific header or sub-navigation could go here */}
      {children}
    </div>
  )
}
