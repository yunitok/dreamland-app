"use client"

import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { Bell, Menu, ArrowLeft } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription
} from "@/modules/shared/ui/sheet"
import { SidebarContent } from "./sidebar"
import { useState, useEffect } from "react"
import { getSession } from "@/lib/auth"

interface HeaderProps {
  titleKey?: string
  descriptionKey?: string
  title?: string
  description?: string
  backHref?: string
  backLabelKey?: string
  user?: {
    id: string
    name: string | null
    role: string
    permissions: string[]
  }
  children?: React.ReactNode
}

export function Header({ titleKey, descriptionKey, backHref, backLabelKey, user, children, ...props }: HeaderProps) {
  const [sessionUser, setSessionUser] = useState<any>(user)
  const t = useTranslations()
  const tCommon = useTranslations("common")

  useEffect(() => {
    if (!user) {
      const fetchSession = async () => {
        const session = await getSession()
        if (session?.user) {
          setSessionUser(session.user)
        }
      }
      fetchSession()
    } else {
      setSessionUser(user)
    }
  }, [user])

  const title = props.title || (titleKey ? t(titleKey) : "Dashboard")
  const description = props.description || (descriptionKey ? t(descriptionKey) : undefined)

  return (
    <header className="sticky top-0 z-30 flex min-h-16 h-auto flex-col border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-sm transition-all duration-300">
      <div className="flex h-16 w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access main app navigation</SheetDescription>
              <SidebarContent user={sessionUser} />
            </SheetContent>
          </Sheet>

          {backHref && (
            <div className="hidden md:block mr-1">
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" asChild>
                <Link href={backHref} title={tCommon('backToApp')}>
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">{backLabelKey && t(backLabelKey)}</span>
                </Link>
              </Button>
            </div>
          )}

          <div className="flex flex-col">
            <h1 className="text-sm md:text-xl font-bold tracking-tight truncate max-w-[120px] xs:max-w-[180px] md:max-w-none">
              {title}
            </h1>
            {description && (
              <p className="hidden sm:block text-[10px] md:text-xs text-muted-foreground leading-none mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Children */}
          <div className="hidden md:flex items-center gap-2">
            {children}
          </div>

          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="sr-only">{tCommon("notifications")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Children (Page specific actions) */}
      {children && (
        <div className="md:hidden w-full pb-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex flex-wrap items-center justify-end gap-2 px-1">
            {children}
          </div>
        </div>
      )}
    </header>
  )
}
