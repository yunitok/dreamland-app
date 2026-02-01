"use client"

import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
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
  children?: React.ReactNode
}

export function Header({ titleKey, descriptionKey, children }: HeaderProps) {
  const t = useTranslations()
  const tCommon = useTranslations("common")

  const title = titleKey ? t(titleKey) : "Dashboard"
  const description = descriptionKey ? t(descriptionKey) : undefined

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
        {children}
        <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
        <ThemeToggle />
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="sr-only">{tCommon("notifications")}</span>
        </Button>
      </div>
    </header>
  )
}
