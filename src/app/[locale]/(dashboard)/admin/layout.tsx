import { RoleGuard } from "@/components/auth/role-guard"



import { setRequestLocale } from "next-intl/server"

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <RoleGuard action="view" resource="admin">
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
            {/* Main sidebar is already provided by parent layout */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    </RoleGuard>
  )
}
