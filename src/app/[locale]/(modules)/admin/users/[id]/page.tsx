import { Header } from "@/components/layout/header"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { UserDialog } from "@/modules/admin/ui/identity/user-dialog"
import { ProjectAccessPanel } from "@/modules/admin/ui/identity/project-access-panel"

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission("users", "read")
  const { id } = await params
  const t = await getTranslations("admin")

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      projectMemberships: {
        include: {
          project: {
            select: { id: true, title: true, department: true, status: true }
          }
        }
      }
    }
  })

  if (!user) notFound()

  const [roles, allProjects] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({
      select: { id: true, title: true, department: true, status: true },
      orderBy: { title: "asc" }
    })
  ])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={user.name || user.username}
        description={user.email || ""}
        backHref="/admin/users"
      >
        <UserDialog user={user} roles={roles} />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
        {/* Información del usuario */}
        <section>
          <h2 className="text-lg font-semibold mb-4">{t("generalInfo")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("username")}</span>
              <p className="font-medium">{user.username}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("email")}</span>
              <p className="font-medium">{user.email || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("role")}</span>
              <p className="font-medium">{user.role.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("columnCreated")}</span>
              <p className="font-medium">{user.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        {/* Panel de acceso a proyectos */}
        <section>
          <ProjectAccessPanel
            userId={user.id}
            currentMemberships={user.projectMemberships}
            allProjects={allProjects}
          />
        </section>
      </div>
    </div>
  )
}
