"use client"

import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { 
  Users,
  Shield,
  LayoutDashboard, 
  FolderKanban, 
  Heart, 
  Settings,
  Zap,
  LogOut,
  FileText,
  Building2
} from "lucide-react"
import { logout } from "@/lib/auth"
import { Button } from "@/modules/shared/ui/button"

interface SidebarContentProps {
  user?: {
    name?: string | null
    role?: string
    permissions?: string[]
  }
}

// Helper to check permissions client-side based on session data
function hasPermission(user: SidebarContentProps['user'], action: string, resource: string) {
  if (!user) return false
  
  // Super Admin and Admin bypass
  if (['SUPER_ADMIN', 'ADMIN'].includes(user.role || '')) return true

  const permissions = user.permissions || []
  // Check for specific permission or manage:* or manage:resource
  // Also mapping 'view' to 'read' if needed, but RBAC likely sends standard actions
  // The sidebar plan used 'view', but rbac.ts uses 'read'. 
  // We should match rbac.ts. 
  // Update sidebar actions to 'read' below.
  return permissions.includes(`${action}:${resource}`) || permissions.includes(`manage:${resource}`)
}

export function SidebarContent({ user }: SidebarContentProps) {
  const pathname = usePathname()
  const t = useTranslations("common")
  const tAdmin = useTranslations("admin")
  const tFooter = useTranslations("footer")
  const router = useRouter()

  // Navigation definition
  const allNavItems = [
    {
      href: "/",
      label: t("dashboard"),
      icon: LayoutDashboard,
      permission: null // Always visible
    },
    {
      href: "/projects",
      label: t("projects"),
      icon: FolderKanban,
      permission: { action: "read", resource: "projects" }
    },
    {
      href: "/sherlock",
      label: "Sherlock",
      icon: Shield,
      permission: { action: "read", resource: "projects" } // Sherlock implies project view
    },
    {
      href: "/reports",
      label: t("reports"),
      icon: FileText,
      permission: { action: "read", resource: "projects" } // Reports linked to projects
    },
    {
      href: "/departments",
      label: t("departments"),
      icon: Building2,
      permission: { action: "read", resource: "departments" }
    },
    {
      href: "/sentiment",
      label: t("teamPulse"),
      icon: Heart,
      permission: { action: "read", resource: "sentiment" }
    },
  ]

  // Filter items based on permissions
  const visibleNavItems = allNavItems.filter(item => 
    item.permission === null || 
    hasPermission(user, item.permission.action, item.permission.resource)
  )

  const canSeeAdmin = hasPermission(user, 'manage', 'admin')

  const handleLogout = async () => {
    await logout()
    router.refresh()
    router.push("/login")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link 
        href="/" 
        className="flex h-16 items-center gap-2 border-b border-border px-6 bg-sidebar cursor-pointer hover:bg-sidebar-accent/30 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground uppercase tracking-[0.2em] font-black">Dreamland</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 bg-sidebar">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-border p-4 bg-sidebar space-y-2">
        {canSeeAdmin && (
             <Link
             href="/admin"
             className={cn(
               "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
               pathname.startsWith('/admin')
                 ? "text-sidebar-foreground bg-sidebar-accent/50"
                 : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
             )}
           >
             <Settings className="h-4 w-4" />
             <span className="truncate">{t("admin")}</span>
           </Link>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
            PM
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.role || tFooter("strategicPM")}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {user?.name || tFooter("enterprise")}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  className?: string
  user?: {
    name?: string | null
    role?: string
    permissions?: string[]
  }
}

export function Sidebar({ className, user }: SidebarProps) {
  return (
    <aside className={cn("fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar", className)}>
      <SidebarContent user={user} />
    </aside>
  )
}
