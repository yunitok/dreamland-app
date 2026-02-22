'use client'

import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { Progress } from '@/modules/shared/ui/progress'
import {
  Calendar,
  Clock,
  Users,
  ArrowLeft
} from 'lucide-react'
import { Link } from "@/i18n/navigation"
import { useTranslations } from 'next-intl'
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { NotificationBell } from "@/modules/notifications/ui/notification-bell"
import { ProjectMembersPanel } from '@/modules/projects/ui/project-members-panel'

interface ProjectHeaderProps {
  project: {
    id: string
    title: string
    department: string
    type: string
    priority: string
    description: string
    progress: number
    startDate: Date | null
    dueDate: Date | null
    color: string | null
  }
  canManage?: boolean
  userId?: string
}

const priorityStyles = {
  High: 'bg-red-500/10 text-red-500 border-red-500/20',
  Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
}

export function ProjectHeader({ project, canManage = false, userId }: ProjectHeaderProps) {
  const t = useTranslations('tasks')
  
  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 py-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Back, Title & Badges */}
        <div className="w-full flex-1 min-w-0 flex items-start gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground transition-colors" asChild>
            <Link href="/projects" title={t('backToProjects')}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">{t('backToProjects')}</span>
            </Link>
          </Button>
          
          <div className="h-8 w-px bg-border hidden sm:block self-center" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div 
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: project.color || '#3B82F6' }}
              />
              <h1 className="text-xl font-bold truncate max-w-[200px] sm:max-w-none">{project.title}</h1>
              <Badge variant="outline" className={priorityStyles[project.priority as keyof typeof priorityStyles]}>
                {project.priority}
              </Badge>
              <Badge variant="secondary">
                {project.type}
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {project.department}
                </span>
                
                {project.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(project.startDate)}
                    {project.dueDate && (
                      <>
                        <span className="text-muted-foreground/50">→</span>
                        {formatDate(project.dueDate)}
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Mobile Progress Bar (Horizontal) */}
              <div className="w-full sm:hidden flex items-center gap-2 mt-2">
                <span className="text-xs font-medium w-12">{project.progress}%</span>
                <Progress value={project.progress} className="h-2 flex-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tools & Desktop Progress */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          
          {/* Desktop Circular Progress */}
          <div className="hidden sm:flex items-center gap-3 bg-accent/30 pr-4 pl-1 py-1 rounded-full border border-border/50">
               <div className="relative flex items-center justify-center p-1">
                 <svg className="w-10 h-10 transform -rotate-90">
                   <circle
                     className="text-muted/20"
                     strokeWidth="3"
                     stroke="currentColor"
                     fill="transparent"
                     r="18"
                     cx="20"
                     cy="20"
                   />
                   <circle
                     className={project.progress === 100 ? "text-emerald-500" : "text-primary"}
                     strokeWidth="3"
                     strokeDasharray={113}
                     strokeDashoffset={113 - (113 * project.progress) / 100}
                     strokeLinecap="round"
                     stroke="currentColor"
                     fill="transparent"
                     r="18"
                     cx="20"
                     cy="20"
                   />
                 </svg>
                 <span className="absolute text-[10px] font-bold">{project.progress}%</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('progress')}</span>
                  <span className="text-xs font-bold">{project.progress === 100 ? t('completed') : t('inProgress')}</span>
               </div>
          </div>

          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <ThemeToggle />
            <LanguageSwitcher />
            <NotificationBell userId={userId} />
            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            <ProjectMembersPanel projectId={project.id} canManage={canManage} />
          </div>
        </div>
      </div>
    </div>
  )
}
