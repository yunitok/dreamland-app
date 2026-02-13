import { requirePermission } from "@/lib/actions/rbac"

export default async function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('departments', 'read')
  return <>{children}</>
}
