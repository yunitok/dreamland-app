import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Task } from '../types'
import { TimelineTaskBar } from './timeline-task-bar'

interface TimelineGridProps {
  statuses: Array<{ id: string; name: string; color: string }>
  tasksByStatus: Record<string, Task[]>
  columns: Array<{ date: Date; label: string; width: number }>
  totalWidth: number
  dateRange: { start: Date; end: Date }
  rowHeight: number
  viewMode: 'month' | 'quarter' | 'year'
  onTaskClick: (taskId: string) => void
}

export const TimelineGrid = forwardRef<HTMLDivElement, TimelineGridProps>(({
  statuses,
  tasksByStatus,
  columns,
  totalWidth,
  dateRange,
  rowHeight,
  viewMode,
  onTaskClick
}, ref) => {
  
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

  return (
    <div 
      ref={ref}
      className="flex-1 overflow-auto"
    >
      <div style={{ width: totalWidth, minHeight: '100%' }}>
        {/* Header */}
        <div className="sticky top-0 bg-muted/30 border-b z-10 h-[40px] flex">
          {columns.map((col, i) => {
             const isCurrent = 
               new Date().getMonth() === col.date.getMonth() && 
               new Date().getFullYear() === col.date.getFullYear() && viewMode === 'month'
            
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-center border-r text-sm font-medium shrink-0",
                  isCurrent && "bg-primary/10 text-primary"
                )}
                style={{ width: col.width }}
              >
                {col.label}
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
            
            return (
              <div 
                key={status.id}
                className="relative border-b"
                style={{ height: Math.max(rowHeight, statusTasks.length * 28 + 20) }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {columns.map((col, i) => (
                    <div 
                      key={i} 
                      className="border-r h-full shrink-0" 
                      style={{ width: col.width }}
                    />
                  ))}
                </div>

                {/* Task bars */}
                <div className="relative h-full p-2" style={{ width: totalWidth }}>
                  {statusTasks.map((task, index) => {
                    const position = getTaskTimelinePosition(task)
                    if (!position) return null

                    return (
                      <TimelineTaskBar
                        key={task.id}
                        task={task}
                        style={{
                          top: index * 28 + 4,
                          left: position.left,
                          width: position.width,
                        }}
                        color={status.color}
                        onClick={onTaskClick}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

TimelineGrid.displayName = 'TimelineGrid'
