'use client'

import { useState, useMemo, useRef } from 'react'
import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

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
  assignee: {
    id: string
    name: string | null
    image: string | null
  } | null
  predecessors: Array<{
    id: string
    predecessor: { id: string; title: string }
  }>
  successors: Array<{
    id: string
    successor: { id: string; title: string }
  }>
  parentId: string | null
}

interface TaskList {
  id: string
  name: string
  color: string | null
  tasks: Task[]
}

interface GanttChartProps {
  project: {
    id: string
    title: string
    startDate: Date | null
    dueDate: Date | null
    lists: TaskList[]
  }
  statuses: Array<{ id: string; name: string; color: string }>
}

const DAY_WIDTH = 40
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 60

export function GanttChart({ project, statuses }: GanttChartProps) {
  const t = useTranslations('tasks')
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  
  // Get all tasks and calculate date range
  const { allTasks, dateRange, dayCount } = useMemo(() => {
    const tasks = project.lists.flatMap(list => list.tasks)
    
    const tasksWithDates = tasks.filter(task => task.startDate || task.dueDate)
    
    if (tasksWithDates.length === 0) {
      // Default to 30 days from today
      const today = new Date()
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      return { 
        allTasks: tasks, 
        dateRange: { start: today, end },
        dayCount: 30
      }
    }

    let minDate = new Date()
    let maxDate = new Date()
    
    tasksWithDates.forEach(task => {
      if (task.startDate) {
        const start = new Date(task.startDate)
        if (start < minDate) minDate = start
        if (start > maxDate) maxDate = start
      }
      if (task.dueDate) {
        const end = new Date(task.dueDate)
        if (end < minDate) minDate = end
        if (end > maxDate) maxDate = end
      }
    })

    // Add padding (1 week before and after)
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 7)

    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      allTasks: tasks,
      dateRange: { start: minDate, end: maxDate },
      dayCount: Math.max(days, 30)
    }
  }, [project.lists])

  const scaledDayWidth = DAY_WIDTH * zoom
  const chartWidth = dayCount * scaledDayWidth
  
  // Generate days for header
  const days = useMemo(() => {
    const result = []
    const current = new Date(dateRange.start)
    
    for (let i = 0; i < dayCount; i++) {
      result.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return result
  }, [dateRange.start, dayCount])

  // Generate months for header
  const months = useMemo(() => {
    const result: { month: string; days: number; startIndex: number }[] = []
    let currentMonth = ''
    let currentDays = 0
    let startIndex = 0

    days.forEach((day, index) => {
      const monthKey = day.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      
      if (monthKey !== currentMonth) {
        if (currentMonth) {
          result.push({ month: currentMonth, days: currentDays, startIndex })
        }
        currentMonth = monthKey
        currentDays = 1
        startIndex = index
      } else {
        currentDays++
      }
    })
    
    if (currentMonth) {
      result.push({ month: currentMonth, days: currentDays, startIndex })
    }

    return result
  }, [days])

  // Calculate task bar position
  const getTaskPosition = (task: Task) => {
    if (!task.startDate && !task.dueDate) return null

    const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!)
    const end = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!)

    const startDiff = Math.floor((start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    return {
      left: startDiff * scaledDayWidth,
      width: duration * scaledDayWidth - 4,
    }
  }

  const scrollToToday = () => {
    if (!containerRef.current) return
    const today = new Date()
    const daysDiff = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    containerRef.current.scrollLeft = daysDiff * scaledDayWidth - 100
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="outline" size="sm" onClick={scrollToToday}>
          <Calendar className="h-4 w-4 mr-2" />
          {t('ganttToday')}
        </Button>
        
        <div className="flex items-center gap-1 ml-auto">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setZoom(z => Math.min(2, z + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task List (Left Panel) */}
        <div className="w-[300px] min-w-[300px] border-r flex flex-col">
          {/* Header */}
          <div className="h-[60px] border-b flex items-end px-3 pb-2 bg-muted/30">
            <span className="text-sm font-medium">{t('task')}</span>
          </div>
          
          {/* Tasks */}
          <div className="flex-1 overflow-y-auto">
            {project.lists.map(list => (
              <div key={list.id}>
                {/* List Header */}
                <div 
                  className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b text-sm font-medium"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: list.color || '#6B7280' }}
                  />
                  {list.name}
                </div>
                
                {/* Tasks */}
                {list.tasks.map((task, index) => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-2 px-3 border-b hover:bg-muted/30"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span 
                      className={cn(
                        "text-sm truncate flex-1",
                        task.parentId && "pl-4",
                        task.status.isClosed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                    {task.assignee && (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={task.assignee.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {task.assignee.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline (Right Panel) */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
        >
          <div style={{ width: chartWidth, minHeight: '100%' }}>
            {/* Header with months and days */}
            <div 
              className="sticky top-0 bg-muted/30 border-b z-10"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Months row */}
              <div className="flex h-[30px] border-b">
                {months.map((month, i) => (
                  <div
                    key={i}
                    className="text-xs font-medium text-muted-foreground flex items-center justify-center border-r"
                    style={{ width: month.days * scaledDayWidth }}
                  >
                    {month.month}
                  </div>
                ))}
              </div>
              
              {/* Days row */}
              <div className="flex h-[30px]">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = day.toDateString() === new Date().toDateString()
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "text-[10px] text-center border-r flex items-center justify-center",
                        isWeekend && "bg-muted/50 text-muted-foreground",
                        isToday && "bg-primary/10 text-primary font-medium"
                      )}
                      style={{ width: scaledDayWidth }}
                    >
                      {day.getDate()}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Task bars */}
            <div className="relative">
              {/* Today line */}
              {(() => {
                const today = new Date()
                const daysDiff = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
                if (daysDiff >= 0 && daysDiff < dayCount) {
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{ left: daysDiff * scaledDayWidth + scaledDayWidth / 2 }}
                    />
                  )
                }
                return null
              })()}

              {project.lists.map(list => (
                <div key={list.id}>
                  {/* List row (empty) */}
                  <div 
                    className="bg-muted/50 border-b"
                    style={{ height: ROW_HEIGHT }}
                  />
                  
                  {/* Task rows */}
                  {list.tasks.map((task) => {
                    const position = getTaskPosition(task)
                    
                    return (
                      <div 
                        key={task.id}
                        className="relative border-b"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Weekend backgrounds */}
                        {days.map((day, i) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          if (!isWeekend) return null
                          return (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 bg-muted/30"
                              style={{ 
                                left: i * scaledDayWidth,
                                width: scaledDayWidth
                              }}
                            />
                          )
                        })}
                        
                        {/* Task bar */}
                        {position && (
                          <div
                            className="absolute top-1 bottom-1 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              left: position.left,
                              width: position.width,
                              backgroundColor: task.status.color,
                            }}
                          >
                            {/* Progress fill */}
                            <div 
                              className="absolute inset-0 rounded-md bg-black/20"
                              style={{ 
                                width: `${task.progress}%`,
                              }}
                            />
                            
                            {/* Task title (if bar is wide enough) */}
                            {position.width > 60 && (
                              <span className="absolute inset-0 px-2 flex items-center text-xs text-white font-medium truncate">
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
