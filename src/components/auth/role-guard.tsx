import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { hasPermission, PermissionAction, PermissionResource } from "@/lib/permissions"
import { getTranslations } from "next-intl/server"

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
  const t = await getTranslations("auth") // Assuming 'auth' namespace exists or will check fallback

  if (!session || !session.user) {
    redirect("/login")
  }

  // We need to verify permissions
  // Note: session.user type from getSession might need structure alignment
  // but based on our auth.ts update, it should include permissions.
  const hasAccess = hasPermission(session.user as any, action, resource)

  if (!hasAccess) {
    // In a real app we might show a "Unauthorized" component or redirect
    redirect(fallbackPath)
  }

  return <>{children}</>
}
