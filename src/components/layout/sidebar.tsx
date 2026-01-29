"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { 
  LayoutDashboard, 
  FolderKanban, 
  Heart, 
  Settings,
  Zap,
  Palette,
  Languages
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"

const navItems = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/projects", labelKey: "projects", icon: FolderKanban },
  { href: "/departments", labelKey: "departments", icon: Zap },
  { href: "/sentiment", labelKey: "teamPulse", icon: Heart },
  { href: "/admin/seed", labelKey: "admin", icon: Settings },
]

export function SidebarContent() {
  const pathname = usePathname()
  const t = useTranslations("common")
  const tFooter = useTranslations("footer")

  // Remove locale prefix from pathname for comparison
  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, '') || '/'

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
        <span className="text-xl font-bold tracking-tight text-white uppercase tracking-[0.2em] font-black">Dreamland</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 bg-sidebar">
        {navItems.map((item) => {
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
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Preferences Section for Mobile/Sidebar */}
      <div className="px-4 py-2 space-y-2 bg-sidebar border-t border-border/50">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {t("preferences")}
        </p>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/30">
          <div className="flex items-center gap-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t("theme")}</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/30">
          <div className="flex items-center gap-3">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t("language")}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{tFooter("strategicPM")}</p>
            <p className="truncate text-xs text-muted-foreground">{tFooter("enterprise")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={cn("fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar", className)}>
      <SidebarContent />
    </aside>
  )
}
