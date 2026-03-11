import { requirePermission } from "@/lib/actions/rbac"

export default async function GastrolabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('gastrolab', 'read')
  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  )
}
