'use client'

import { useState, useMemo, useRef } from 'react'
import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter
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
  parentId: string | null
}

interface TaskList {
  id: string
  name: string
  color: string | null
  tasks: Task[]
}

interface TimelineViewProps {
  project: {
    id: string
    title: string
    startDate: Date | null
    dueDate: Date | null
    lists: TaskList[]
  }
  statuses: Array<{ id: string; name: string; color: string }>
}

const MONTH_WIDTH = 200
const ROW_HEIGHT = 48

export function TimelineView({ project, statuses }: TimelineViewProps) {
  const t = useTranslations('tasks')
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('month')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Get all tasks and calculate date range
  const { allTasks, months, dateRange } = useMemo(() => {
    const tasks = project.lists.flatMap(list => 
      list.tasks.filter(task => statusFilter === 'all' || task.status.id === statusFilter)
    )
    
    const tasksWithDates = tasks.filter(task => task.startDate || task.dueDate)
    
    // Calculate date range
    let minDate = new Date()
    let maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 6)
    
    if (tasksWithDates.length > 0) {
      tasksWithDates.forEach(task => {
        if (task.startDate) {
          const start = new Date(task.startDate)
          if (start < minDate) minDate = new Date(start)
          if (start > maxDate) maxDate = new Date(start)
        }
        if (task.dueDate) {
          const end = new Date(task.dueDate)
          if (end < minDate) minDate = new Date(end)
          if (end > maxDate) maxDate = new Date(end)
        }
      })
    }

    // Expand to full months
    minDate.setDate(1)
    maxDate.setMonth(maxDate.getMonth() + 1)
    maxDate.setDate(0)

    // Generate months
    const monthsList: { date: Date; label: string }[] = []
    const current = new Date(minDate)
    
    while (current <= maxDate) {
      monthsList.push({
        date: new Date(current),
        label: current.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      })
      current.setMonth(current.getMonth() + 1)
    }

    return {
      allTasks: tasks,
      months: monthsList,
      dateRange: { start: minDate, end: maxDate }
    }
  }, [project.lists, statusFilter])

  const totalWidth = months.length * MONTH_WIDTH

  // Calculate task timeline position
  const getTaskTimelinePosition = (task: Task) => {
    if (!task.startDate && !task.dueDate) return null

    const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!)
    const end = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!)
    
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime()
    const startOffset = (start.getTime() - dateRange.start.getTime()) / totalMs
    const endOffset = (end.getTime() - dateRange.start.getTime()) / totalMs

    return {
      left: `${Math.max(0, startOffset * 100)}%`,
      width: `${Math.max(2, (endOffset - startOffset) * 100)}%`,
    }
  }

  const scrollToToday = () => {
    if (!containerRef.current) return
    const today = new Date()
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime()
    const todayOffset = (today.getTime() - dateRange.start.getTime()) / totalMs
    containerRef.current.scrollLeft = todayOffset * totalWidth - 200
  }

  // Group tasks by status for the swimlane view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    statuses.forEach(status => {
      grouped[status.id] = allTasks.filter(task => task.status.id === status.id)
    })
    return grouped
  }, [allTasks, statuses])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="outline" size="sm" onClick={scrollToToday}>
          <Calendar className="h-4 w-4 mr-2" />
          {t('ganttToday')}
        </Button>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          {(['month', 'quarter', 'year'] as const).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-3"
              onClick={() => setViewMode(mode)}
            >
              {t(`timeline.${mode}`)}
            </Button>
          ))}
        </div>

        <span className="text-sm text-muted-foreground ml-auto">
          {allTasks.length} {t('tasks')}
        </span>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Status Labels (Left Panel) */}
        <div className="w-[200px] min-w-[200px] border-r flex flex-col bg-muted/20">
          {/* Header spacer */}
          <div className="h-[40px] border-b" />
          
          {/* Status rows */}
          {statuses.map(status => (
            <div
              key={status.id}
              className="border-b flex items-center gap-2 px-3"
              style={{ height: Math.max(ROW_HEIGHT, (tasksByStatus[status.id]?.length || 1) * 28 + 20) }}
            >
              <div 
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-sm font-medium truncate">{status.name}</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {tasksByStatus[status.id]?.length || 0}
              </Badge>
            </div>
          ))}
        </div>

        {/* Timeline (Right Panel) */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
        >
          <div style={{ width: totalWidth, minHeight: '100%' }}>
            {/* Month Header */}
            <div className="sticky top-0 bg-muted/30 border-b z-10 h-[40px] flex">
              {months.map((month, i) => {
                const isCurrentMonth = 
                  new Date().getMonth() === month.date.getMonth() && 
                  new Date().getFullYear() === month.date.getFullYear()
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-center border-r text-sm font-medium",
                      isCurrentMonth && "bg-primary/10 text-primary"
                    )}
                    style={{ width: MONTH_WIDTH }}
                  >
                    {month.label}
                  </div>
                )
              })}
            </div>

            {/* Status Swimlanes */}
            <div className="relative">
              {/* Today line */}
              {(() => {
                const today = new Date()
                if (today >= dateRange.start && today <= dateRange.end) {
                  const totalMs = dateRange.end.getTime() - dateRange.start.getTime()
                  const offset = (today.getTime() - dateRange.start.getTime()) / totalMs * 100
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{ left: `${offset}%` }}
                    />
                  )
                }
                return null
              })()}

              {statuses.map(status => {
                const statusTasks = tasksByStatus[status.id] || []
                const rowHeight = Math.max(ROW_HEIGHT, statusTasks.length * 28 + 20)

                return (
                  <div 
                    key={status.id}
                    className="relative border-b"
                    style={{ height: rowHeight }}
                  >
                    {/* Month grid lines */}
                    <div className="absolute inset-0 flex">
                      {months.map((_, i) => (
                        <div 
                          key={i} 
                          className="border-r h-full" 
                          style={{ width: MONTH_WIDTH }}
                        />
                      ))}
                    </div>

                    {/* Task bars */}
                    <div className="relative h-full p-2" style={{ width: totalWidth }}>
                      {statusTasks.map((task, index) => {
                        const position = getTaskTimelinePosition(task)
                        if (!position) return null

                        return (
                          <div
                            key={task.id}
                            className="absolute h-6 rounded-md cursor-pointer hover:opacity-90 transition-all group"
                            style={{
                              top: index * 28 + 4,
                              left: position.left,
                              width: position.width,
                              minWidth: 20,
                              backgroundColor: status.color,
                            }}
                          >
                            {/* Progress fill */}
                            <div 
                              className="absolute inset-0 rounded-md bg-black/20"
                              style={{ width: `${task.progress}%` }}
                            />
                            
                            {/* Title */}
                            <span className="absolute inset-0 px-2 flex items-center text-xs text-white font-medium truncate">
                              {task.title}
                            </span>

                            {/* Assignee */}
                            {task.assignee && (
                              <Avatar className="absolute -right-3 top-0 h-6 w-6 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity">
                                <AvatarImage src={task.assignee.image || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {task.assignee.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
