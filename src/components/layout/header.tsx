"use client"

import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { logout } from "@/lib/auth"
import { useRouter } from "@/i18n/navigation"
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet"
import { SidebarContent } from "./sidebar"

interface HeaderProps {
  titleKey?: string
  descriptionKey?: string
}

export function Header({ titleKey, descriptionKey }: HeaderProps) {
  const t = useTranslations()
  const tCommon = useTranslations("common")
  const router = useRouter()

  const title = titleKey ? t(titleKey) : "Dashboard"
  const description = descriptionKey ? t(descriptionKey) : undefined

  const handleLogout = async () => {
    await logout()
    router.refresh()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-sm">
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
            <SidebarContent />
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-col">
          <h1 className="text-sm md:text-xl font-bold tracking-tight truncate max-w-[140px] xs:max-w-[200px] md:max-w-none">
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
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
            <Bell className="h-4 w-4" />
            <span className="sr-only">{tCommon("notifications")}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
          <Avatar className="hidden xs:flex h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-xs text-white">
              PM
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
