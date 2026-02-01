import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { hasPermission, PermissionAction, PermissionResource, UserSession } from "@/lib/permissions"
// import { getTranslations } from "next-intl/server"

interface RoleGuardProps {
  children: React.ReactNode
  action: PermissionAction
  resource: PermissionResource
  fallbackPath?: string
}

export async function RoleGuard({ 
  children, 
  action, 
  resource,
  fallbackPath = "/" 
}: RoleGuardProps) {
  const session = await getSession()

  if (!session || !session.user) {
    redirect("/login")
  }

  // We need to verify permissions
  // session.user from auth.ts matches UserSession['user'] structure (flattened role code & permissions)
  const hasAccess = hasPermission(session.user as unknown as UserSession['user'], action, resource)

  if (!hasAccess) {
    // In a real app we might show a "Unauthorized" component or redirect
    redirect(fallbackPath)
  }

  return <>{children}</>
}
