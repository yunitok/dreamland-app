/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  Layers,
  LayoutTemplate,
  ListTree,
  CalendarDays
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"

interface Task {
  id: string
  title: string
  startDate: Date | null
  dueDate: Date | null
  progress: number
  status: {
    id: string
    name: string
    color: string
    isClosed: boolean
  }
}

interface Project {
  id: string
  title: string
  color: string | null
  lists: {
    id: string
    tasks: Task[]
  }[]
}

interface PortfolioTimelineProps {
  projects: Project[]
}

const BASE_DAY_WIDTH = 40
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 60

// Helper to generate consistent colors from strings
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export function PortfolioTimeline({ projects }: PortfolioTimelineProps) {
  const t = useTranslations('projects')
  const locale = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // States
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')
  const [timeScale, setTimeScale] = useState<'days' | 'months' | 'years'>('months')
  const [zoom, setZoom] = useState(1)

  // Auto-adjust zoom based on timeScale
  useEffect(() => {
    switch (timeScale) {
        case 'days': setZoom(1); break;
        case 'months': setZoom(0.3); break;
        case 'years': setZoom(0.1); break;
    }
  }, [timeScale])

  // Flatten tasks to calculate global date range and Project summaries
  const { dateRange, dayCount, projectRanges } = useMemo(() => {
    const allTasks = projects.flatMap(p => p.lists.flatMap(l => l.tasks))
    const tasksWithDates = allTasks.filter(task => task.startDate || task.dueDate)
    let minDate = new Date()
    let maxDate = new Date()

    // Calculate project ranges for summary view
    const ranges: Record<string, { start: Date, end: Date }> = {}

    projects.forEach(project => {
        const projectTasks = project.lists.flatMap(l => l.tasks).filter(t => t.startDate || t.dueDate)
        if (projectTasks.length > 0) {
            let pMin = new Date(8640000000000000)
            let pMax = new Date(-8640000000000000)
            projectTasks.forEach(t => {
                const s = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!)
                const e = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate!)
                if (s < pMin) pMin = s
                if (e > pMax) pMax = e
            })
            ranges[project.id] = { start: pMin, end: pMax }
            
            // Global Update
            if (pMin < minDate) minDate = pMin
            if (pMax > maxDate) maxDate = pMax
        }
    })

    if (tasksWithDates.length === 0 && Object.keys(ranges).length === 0) {
      const today = new Date()
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      return {
        dateRange: { start: today, end },
        dayCount: 30,
        projectRanges: {}
      }
    }

    // Padding
    const paddedMin = new Date(minDate)
    paddedMin.setDate(paddedMin.getDate() - 15)
    const paddedMax = new Date(maxDate)
    paddedMax.setDate(paddedMax.getDate() + 30)

    const days = Math.ceil((paddedMax.getTime() - paddedMin.getTime()) / (1000 * 60 * 60 * 24))

    return {
      dateRange: { start: paddedMin, end: paddedMax },
      dayCount: Math.max(days, 30),
      projectRanges: ranges
    }
  }, [projects])

  const scaledDayWidth = BASE_DAY_WIDTH * zoom
  const chartWidth = dayCount * scaledDayWidth

  // Generate days
  const days = useMemo(() => {
    const result = []
    const current = new Date(dateRange.start)
    for (let i = 0; i < dayCount; i++) {
        result.push(new Date(current))
        current.setDate(current.getDate() + 1)
    }
    return result
  }, [dateRange.start, dayCount])

  // Generate months
  const months = useMemo(() => {
    const result: { month: string; days: number; year: string }[] = []
    let currentMonth = ''
    let currentYear = ''
    let currentDays = 0

    days.forEach((day) => {
      const monthKey = day.toLocaleDateString(locale, { month: 'short' })
      const yearKey = day.getFullYear().toString()
      const fullKey = `${monthKey}-${yearKey}`

      if (fullKey !== currentMonth + '-' + currentYear) {
        if (currentMonth) {
          result.push({ month: currentMonth, year: currentYear, days: currentDays })
        }
        currentMonth = monthKey
        currentYear = yearKey
        currentDays = 1
      } else {
        currentDays++
      }
    })
    if (currentMonth) {
      result.push({ month: currentMonth, year: currentYear, days: currentDays })
    }
    return result
  }, [days])

  // Helpers
  const getPosition = (start: Date, end: Date) => {
    const startDiff = Math.floor((start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    return {
      left: startDiff * scaledDayWidth,
      width: duration * scaledDayWidth,
    }
  }

  const getTaskPosition = (task: Task) => {
    if (!task.startDate && !task.dueDate) return null
    const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!)
    const end = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!)
    return getPosition(start, end)
  }

  const getProjectColor = (project: Project) => {
      if (project.color && project.color.startsWith('#')) return project.color
      return stringToColor(project.id)
  }

  const scrollToToday = () => {
    if (!containerRef.current) return
    const today = new Date()
    const daysDiff = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    containerRef.current.scrollLeft = daysDiff * scaledDayWidth - 200
  }

  // Initial scroll
  useEffect(() => {
      scrollToToday()
  }, [dateRange])

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-background border rounded-lg overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border-b bg-card">
        <div className="flex items-center gap-2">
           <Layers className="h-5 w-5 text-primary" />
           <span className="font-semibold text-lg tracking-tight">{t('title')}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
             <Button 
                variant={viewMode === 'summary' ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setViewMode('summary')}
                className="h-7 text-xs"
             >
                <LayoutTemplate className="h-3 w-3 mr-1.5" />
                {t('timeline.projects')}
             </Button>
             <Button 
                variant={viewMode === 'detailed' ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setViewMode('detailed')}
                className="h-7 text-xs"
             >
                <ListTree className="h-3 w-3 mr-1.5" />
                {t('timeline.detail')}
             </Button>
        </div>

        <div className="flex items-center gap-2">
            <Select value={timeScale} onValueChange={(v: any) => setTimeScale(v)}>
                <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue placeholder={t('timeline.scale')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="days">{t('timeline.days')}</SelectItem>
                    <SelectItem value="months">{t('timeline.months')}</SelectItem>
                    <SelectItem value="years">{t('timeline.years')}</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={scrollToToday} className="h-8 text-xs">
            <Calendar className="h-3 w-3 mr-1.5" />
            {t('timeline.today')}
          </Button>
          <div className="w-px h-4 bg-border mx-2" />
          <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.01, z * 0.8))} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(5, z * 1.25))} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Project List */}
        <div className="w-[200px] min-w-[200px] md:w-[260px] md:min-w-[260px] border-r flex flex-col bg-card/50 z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="h-[50px] border-b flex items-center px-4 font-medium text-xs text-muted-foreground bg-muted/20 uppercase tracking-wider">
            {viewMode === 'summary' ? t('timeline.projects') : t('timeline.projectsAndTasks')}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {projects.map(project => (
              <div key={project.id} className="border-b last:border-0 group">
                {/* Project Header */}
                <div 
                    className="flex items-center gap-3 px-4 py-2 bg-background/50 font-medium text-sm transition-colors hover:bg-muted/50"
                    style={{ height: ROW_HEIGHT }}
                >
                  <div 
                    className="w-3 h-3 rounded-md shrink-0 shadow-sm ring-1 ring-inset ring-black/5" 
                    style={{ backgroundColor: getProjectColor(project) }} 
                  />
                  <span className="truncate leading-tight">{project.title}</span>
                </div>
                
                {/* Tasks (Detailed View Only) */}
                {viewMode === 'detailed' && project.lists.flatMap(l => l.tasks).map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center pl-10 pr-4 border-b last:border-0 text-xs text-muted-foreground hover:bg-muted/30"
                    style={{ height: 32 }}
                  >
                     <div className="w-1.5 h-1.5 rounded-full mr-2 shrink-0 transition-colors" style={{ backgroundColor: task.status.color }} />
                     <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Timeline */}
        <div ref={containerRef} className="flex-1 overflow-auto relative bg-slate-50/30 dark:bg-background/10">
          <div style={{ width: chartWidth, minHeight: '100%' }}>
            {/* Calendar Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-30 border-b shadow-sm">
              {/* Month/Year Row */}
              <div className="flex h-[28px] border-b">
                {months.map((m, i) => (
                  <div 
                    key={i} 
                    className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center px-2 border-r bg-muted/5 truncate sticky left-0" 
                    style={{ width: m.days * scaledDayWidth }}
                  >
                    {m.month} <span className="opacity-50 ml-1 font-normal">{m.year}</span>
                  </div>
                ))}
              </div>
              {/* Day Row (only if zoomed in enough) */}
              <div className="flex h-[22px]">
                {days.map((d, i) => {
                   const isWeekend = d.getDay() === 0 || d.getDay() === 6
                   const isToday = d.toDateString() === new Date().toDateString()
                   return (
                     <div key={i} className={cn(
                       "text-[9px] text-center border-r flex items-center justify-center transition-colors",
                       isWeekend && "bg-muted/20 text-muted-foreground/40",
                       isToday && "bg-primary/10 text-primary font-bold"
                     )} style={{ width: scaledDayWidth }}>
                       {scaledDayWidth > 15 && d.getDate()}
                     </div>
                   )
                })}
              </div>
            </div>

            {/* Bars Overlay */}
            <div className="relative">
              {/* Today Vertical Line */}
              {(() => {
                 const today = new Date()
                 const diff = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
                 return diff >= 0 ? <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-20 pointer-events-none" style={{ left: diff * scaledDayWidth + scaledDayWidth/2 }} /> : null
              })()}

              {/* Grid Lines (Weekends) */}
              <div className="absolute inset-0 pointer-events-none z-0 flex">
                  {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                     <div key={i} className="absolute top-0 bottom-0 bg-muted/5 border-l border-border/20" style={{ left: i * scaledDayWidth, width: Math.max(1, scaledDayWidth) }} />
                  ))}
              </div>

              {projects.map(project => (
                <div key={project.id} className="relative z-10">
                  {/* Project Row */}
                  <div className="border-b relative group hover:bg-muted/5 transition-colors" style={{ height: ROW_HEIGHT }}>
                      {viewMode === 'summary' && projectRanges[project.id] && (
                        (() => {
                            const range = projectRanges[project.id]
                            const pos = getPosition(range.start, range.end)
                            const color = getProjectColor(project)
                            return (
                                <div 
                                    className="absolute top-2.5 bottom-2.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center px-3"
                                    style={{ 
                                        left: pos.left, 
                                        width: pos.width, 
                                        backgroundColor: color + '20', // Low opacity background
                                        border: `1px solid ${color}`,
                                        borderLeft: `4px solid ${color}`
                                    }}
                                >
                                    <div className="h-1.5 rounded-full bg-current opacity-20 w-full" style={{ color: color }} />
                                    <span style={{ color: color }} className="ml-3 text-xs font-bold whitespace-nowrap drop-shadow-sm sticky left-4">{project.title}</span>
                                </div>
                            )
                        })()
                      )}
                  </div>

                  {/* Task Rows (Detailed View) */}
                  {viewMode === 'detailed' && project.lists.flatMap(l => l.tasks).map(task => {
                    const pos = getTaskPosition(task)
                    const color = task.status.color
                    return (
                        <div key={task.id} className="relative border-b h-[32px] group hover:bg-muted/10 transition-colors">
                            {pos && (
                                <div
                                    className="absolute top-1.5 bottom-1.5 rounded-sm shadow-sm hover:shadow hover:ring-1 hover:ring-white/20 cursor-pointer transition-all"
                                    style={{
                                        left: pos.left,
                                        width: Math.max(4, pos.width - 2),
                                        backgroundColor: color,
                                        opacity: task.progress === 100 ? 0.6 : 0.9
                                    }}
                                >
                                    {pos.width > 20 && (
                                        <span className="absolute left-1 top-0 bottom-0 flex items-center text-[9px] text-white font-medium truncate px-1">
                                            {task.title}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
