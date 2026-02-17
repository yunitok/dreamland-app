import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { getUsers } from "@/modules/admin/actions/identity-users"
import { getRoles } from "@/modules/admin/actions/identity-roles"
import { UserDialog } from "@/modules/admin/ui/identity/user-dialog"
import { UsersTable } from "./users-table"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations } from "next-intl/server"

export default async function UsersPage() {
  const t = await getTranslations("admin")
  const [usersResult, rolesResult] = await Promise.all([getUsers(), getRoles()])

  if (!usersResult.success || !rolesResult.success) {
    return <div>{t("errorLoadingUsers")}</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("usersTitle")}
        description={t("usersDescription")}
        backHref="/admin"
      >
        <div className="flex items-center space-x-2">
          <UserDialog roles={rolesResult.data!} />
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <UsersTable data={usersResult.data!} roles={rolesResult.data || []} />
        </Suspense>
      </div>
    </div>
  )
}
