import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { getRoles } from "@/modules/admin/actions/identity-roles"
import { RoleDialog } from "@/components/admin/role-dialog"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations } from "next-intl/server"
import { Badge } from "@/modules/shared/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/modules/shared/ui/card"
import { requirePermission } from "@/lib/actions/rbac"
import { Users } from "lucide-react"

export default async function RolesPage() {
  await requirePermission('roles', 'read')
  const t = await getTranslations("admin")
  const result = await getRoles()

  if (!result.success) {
    return <div>{t("errorLoadingUsers")}</div>
  }

  const roles = result.data || []

  return (
    <div className="flex h-full flex-col">
      <Header 
        title={t("roles")} 
        description={t("manageRolesDescription")} 
        backHref="/admin"
      >
        <div className="flex items-center space-x-2">
          <RoleDialog />
        </div>
      </Header>
      
      <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold">
                    {role.name}
                </CardTitle>
                <CardDescription className="text-sm line-clamp-2 min-h-[40px]">
                    {role.description || "No description"}
                </CardDescription>
              </div>
              {role.isSystem && (
                <Badge variant="secondary">{t("isSystem")}</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="mt-2 flex flex-wrap gap-2">
                 {role.permissions.slice(0, 3).map(p => (
                   <Badge key={p.id} variant="outline" className="text-xs py-1">{p.action}:{p.resource}</Badge>
                 ))}
                 {role.permissions.length > 3 && (
                   <Badge variant="outline" className="text-xs py-1">+{role.permissions.length - 3}</Badge>
                 )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 text-sm text-muted-foreground flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{role._count?.users || 0} {t("users")}</span>
                </div>
                <div className="flex justify-end">
                    <RoleDialog role={role} />
                </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
    </div>
  )
}
