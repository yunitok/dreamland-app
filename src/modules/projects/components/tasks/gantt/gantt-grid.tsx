import { useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Task } from '../types'
import { GanttTaskBar } from './gantt-task-bar'

interface TaskList {
  id: string
  name: string
  color: string | null
  tasks: Task[]
}

interface GanttGridProps {
  lists: TaskList[]
  dateRange: { start: Date; end: Date }
  dayCount: number
  zoom: number
  onTaskClick: (taskId: string) => void
  rowHeight: number
  headerHeight: number
  onScroll: (scrollTop: number) => void
}

const DAY_WIDTH = 40

export function GanttGrid({ 
  lists, 
  dateRange, 
  dayCount, 
  zoom, 
  onTaskClick,
  rowHeight,
  headerHeight,
  onScroll
}: GanttGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScroll(e.currentTarget.scrollTop)
  }

  return (
    <div 
      className="flex-1 overflow-auto"
      onScroll={handleScroll}
      ref={containerRef}
    >
      <div style={{ width: chartWidth, minHeight: '100%' }}>
        {/* Header with months and days */}
        <div 
          className="sticky top-0 bg-muted/30 border-b z-20 bg-background"
          style={{ height: headerHeight }}
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

          {lists.map(list => (
            <div key={list.id}>
              {/* List row (empty placeholder matching sidebar) */}
              <div 
                className="bg-muted/50 border-b"
                style={{ height: rowHeight }}
              />
              
              {/* Task rows */}
              {list.tasks.map((task) => {
                const position = getTaskPosition(task)
                
                return (
                  <div 
                    key={task.id}
                    className="relative border-b"
                    style={{ height: rowHeight }}
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
                      <GanttTaskBar
                        task={task}
                        style={{
                          left: position.left,
                          width: position.width,
                        }}
                        onClick={onTaskClick}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
