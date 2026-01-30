import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Users, Shield, FolderGit2, Activity } from "lucide-react"
import { prisma } from "@/lib/prisma"

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")

  // Fetch real data in parallel
  const [userCount, roleCount, projectCount, departmentCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.project.count(),
    prisma.teamMood.count()
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalUsers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">
              {t("inDatabase")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("activeRoles")}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCount}</div>
            <p className="text-xs text-muted-foreground">
                {t("inDatabase")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                {t("permissions.resources.projects")}
            </CardTitle>
            <FolderGit2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
            <p className="text-xs text-muted-foreground">
                {t("inDatabase")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                {t("departmentsTracked")}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentCount}</div>
            <p className="text-xs text-muted-foreground">
                {t("teamPulse")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
