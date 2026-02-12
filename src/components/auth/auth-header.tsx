
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export function AuthHeader() {
  return (
    <header className="absolute top-4 right-4 z-50 flex items-center gap-2">
      <LanguageSwitcher />
      <ThemeToggle />
    </header>
  )
}
