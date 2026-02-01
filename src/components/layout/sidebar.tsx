"use client"

import { usePathname } from "next/navigation"
import { Link, useRouter } from "@/i18n/navigation"
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
  LogOut
} from "lucide-react"
import { logout } from "@/lib/auth"
import { Button } from "@/components/ui/button"

interface SidebarContentProps {
  user?: {
    name?: string | null
    role?: string
  }
}

export function SidebarContent({ user }: SidebarContentProps) {
  const pathname = usePathname()

  const t = useTranslations("common")
  const tAdmin = useTranslations("admin")
  const tFooter = useTranslations("footer")
  const router = useRouter()

  // Remove locale prefix from pathname for comparison
  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, '') || '/'
  const isAdminSection = pathWithoutLocale.startsWith('/admin')

  const appNavItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/projects", label: t("projects"), icon: FolderKanban },
    { href: "/departments", label: t("departments"), icon: Zap },
    { href: "/sentiment", label: t("teamPulse"), icon: Heart },
  ]

  const adminNavItems = [
    { href: "/admin", label: tAdmin("dashboard"), icon: LayoutDashboard },
    { href: "/admin/users", label: tAdmin("users"), icon: Users },
    { href: "/admin/roles", label: tAdmin("roles"), icon: Shield },
  ]

  const currentNavItems = isAdminSection ? adminNavItems : appNavItems

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
        {isAdminSection && (
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground mb-4 border border-dashed border-border"
            >
              <LogOut className="h-4 w-4 rotate-180" />
              <span className="truncate">{t("backToApp")}</span>
            </Link>
        )}

        {currentNavItems.map((item) => {
          const isActive = pathWithoutLocale === item.href || 
            (item.href !== "/" && pathWithoutLocale.startsWith(item.href))
          
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
        {!isAdminSection && (
             <Link
             href="/admin"
             className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
           >
             <Settings className="h-4 w-4" />
             <span className="truncate">{t("admin")}</span>
           </Link>
        )}

        <div className={cn(
          "flex items-center gap-3 pt-2",
          !isAdminSection && "border-t border-border/50"
        )}>
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
  }
}

export function Sidebar({ className, user }: SidebarProps) {
  return (
    <aside className={cn("fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar", className)}>
      <SidebarContent user={user} />
    </aside>
  )
}
