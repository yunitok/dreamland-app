import { requirePermission } from "@/lib/actions/rbac"

export default async function AtcLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('atc', 'read')
  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  )
}
