'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { 
  List, 
  LayoutGrid, 
  GanttChart, 
  Calendar, 
  Clock
} from 'lucide-react'

interface ViewTabsProps {
  projectId: string
}

const views = [
  { key: 'list', icon: List, label: 'list' },
  { key: 'board', icon: LayoutGrid, label: 'board' },
  { key: 'gantt', icon: GanttChart, label: 'gantt' },
  { key: 'calendar', icon: Calendar, label: 'calendar' },
  { key: 'timeline', icon: Clock, label: 'timeline' },
] as const

export function ViewTabs({ projectId }: ViewTabsProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('tasks')
  
  const currentView = views.find(v => pathname.includes(`/${v.key}`))?.key || 'list'

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-1 px-6 py-1">
        {views.map((view) => {
          const Icon = view.icon
          const isActive = currentView === view.key
          
          return (
            <Link
              key={view.key}
              href={`/${locale}/projects/${projectId}/${view.key}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
                "hover:bg-muted/50",
                isActive 
                  ? "text-primary bg-primary/5 border-b-2 border-primary -mb-[1px]" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t(`views.${view.label}`)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
