"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { Globe } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { FlagUK, FlagES, FlagDE, FlagFR, FlagIT, FlagRU } from "@/components/ui/icons/flags"

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const onSelectChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }

  const languages = [
    { code: 'en', label: 'English', icon: FlagUK },
    { code: 'es', label: 'Español', icon: FlagES },
    { code: 'de', label: 'Deutsch', icon: FlagDE },
    { code: 'fr', label: 'Français', icon: FlagFR },
    { code: 'it', label: 'Italiano', icon: FlagIT },
    { code: 'ru', label: 'Русский', icon: FlagRU },
  ]

  const currentLanguage = languages.find(l => l.code === locale)

  return (
    <Select value={locale} onValueChange={onSelectChange}>
      <SelectTrigger className="w-12 h-9 p-0 border-none bg-transparent hover:bg-accent focus:ring-0 flex items-center justify-center">
        <SelectValue asChild>
          <div className="flex items-center justify-center">
             {currentLanguage && <currentLanguage.icon className="w-6 h-6 rounded-full overflow-hidden object-cover shadow-sm" />}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-3">
              <lang.icon className="w-5 h-5 rounded-full shadow-sm" />
              <span className="text-sm">{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
