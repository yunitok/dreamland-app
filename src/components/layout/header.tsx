"use client"

import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface HeaderProps {
  titleKey?: string
  descriptionKey?: string
}

export function Header({ titleKey, descriptionKey }: HeaderProps) {
  const t = useTranslations()
  const tCommon = useTranslations("common")

  const title = titleKey ? t(titleKey) : "Dashboard"
  const description = descriptionKey ? t(descriptionKey) : undefined

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="sr-only">{tCommon("notifications")}</span>
        </Button>
        <ThemeToggle />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-xs text-white">
            PM
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
