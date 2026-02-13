'use client'

import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { 
  Calendar, 
  ArrowLeft,
  FileText
} from 'lucide-react'
import { Link } from "@/i18n/navigation"
import { useTranslations } from 'next-intl'
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Bell, Printer } from "lucide-react"

interface ReportHeaderProps {
  report: {
    id: string
    title: string
    content: string
    createdAt: Date
    type: string
  }
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const t = useTranslations('reports')
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 py-4 no-print">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Back, Title & Badges */}
        <div className="w-full flex-1 min-w-0 flex items-start gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground transition-colors" asChild>
            <Link href="/reports" title={t('backToReports')}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">{t('backToReports')}</span>
            </Link>
          </Button>
          
          <div className="h-8 w-px bg-border hidden sm:block self-center" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-primary" />
                </div>
                
                <h1 className="text-xl font-bold truncate max-w-[200px] sm:max-w-none">{report.title}</h1>
                
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {report.type}
                </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(report.createdAt)}
                </span>
                </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tools & Actions */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <Button onClick={handlePrint} variant="outline" size="sm" className="hidden sm:flex">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" size="icon" className="sm:hidden h-9 w-9">
                <Printer className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
