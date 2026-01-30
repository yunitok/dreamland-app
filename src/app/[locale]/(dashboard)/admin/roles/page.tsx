import { getRoles } from "@/lib/actions/roles"
import { RoleDialog } from "@/components/admin/role-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Plus } from "lucide-react"

export default async function RolesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")
  const { data: roles } = await getRoles()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("roles")}</h1>
          <p className="text-muted-foreground">{t("manageRolesDescription")}</p>
        </div>
        <RoleDialog />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("roleName")}</TableHead>
              <TableHead>{t("users")}</TableHead>
              <TableHead>{t("isSystem")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles?.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role._count.users}</TableCell>
                <TableCell>{role.isSystem ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  {role.isSystem ? (
                    <span className="text-muted-foreground text-xs italic pr-2">System</span>
                  ) : (
                    <RoleDialog role={role} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
