import { requirePermission } from "@/lib/actions/rbac"

export default async function CalidadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('calidad', 'read')
  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  )
}
