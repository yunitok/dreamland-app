'use client'

import { useState, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { TaskDetailSheet } from './task-detail-sheet'
import { TimelineToolbar } from './timeline/timeline-toolbar'
import { TimelineSidebar } from './timeline/timeline-sidebar'
import { TimelineGrid } from './timeline/timeline-grid'

import { Task } from './types'

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
  statuses: Array<{ id: string; name: string; color: string; isClosed: boolean; isDefault: boolean }>
  tags: Array<{ id: string; name: string; color: string; projectId: string }>
  users: Array<{ id: string; name: string | null; image: string | null; username: string }>
  currentUserId: string
}

const MONTH_WIDTH = 200
const ROW_HEIGHT = 48

export function TimelineView({ project, statuses, tags, users, currentUserId }: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('month')
  const [statusFilter] = useState<string>('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Get all tasks and calculate date range with dynamic view mode
  const { allTasks, columns, dateRange } = useMemo(() => {
    const tasks = project.lists.flatMap(list => 
      list.tasks.filter(task => statusFilter === 'all' || task.status.id === statusFilter)
    )
    
    const tasksWithDates = tasks.filter(task => task.startDate || task.dueDate)
    
    // Calculate initial date range from tasks
    let minDate = new Date()
    let maxDate = new Date()
    
    // Default view range: current date +/- some months if no tasks
    if (tasksWithDates.length === 0) {
      minDate.setMonth(minDate.getMonth() - 1)
      maxDate.setMonth(maxDate.getMonth() + 5)
    } else {
      // Find min/max from tasks
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
      
      // Add buffer based on view mode
       if (viewMode === 'month') {
        minDate.setMonth(minDate.getMonth() - 1)
        maxDate.setMonth(maxDate.getMonth() + 2)
       } else if (viewMode === 'quarter') {
        minDate.setMonth(minDate.getMonth() - 3)
        maxDate.setMonth(maxDate.getMonth() + 6)
       } else {
        minDate.setFullYear(minDate.getFullYear() - 1)
        maxDate.setFullYear(maxDate.getFullYear() + 1)
       }
    }

    // Align dates to view boundaries
    if (viewMode === 'month') {
      minDate.setDate(1)
      maxDate.setMonth(maxDate.getMonth() + 1)
      maxDate.setDate(0)
    } else if (viewMode === 'quarter') {
      const currentMonth = minDate.getMonth()
      const startQuarterMonth = Math.floor(currentMonth / 3) * 3
      minDate.setMonth(startQuarterMonth) 
      minDate.setDate(1)
      
      const endMonth = maxDate.getMonth()
      const endQuarterMonth = Math.floor(endMonth / 3) * 3 + 3 
      maxDate.setMonth(endQuarterMonth) 
      maxDate.setDate(0) 
    } else if (viewMode === 'year') {
      minDate.setMonth(0, 1) 
      maxDate.setMonth(11, 31) 
    }

    // Generate columns
    const columnsList: { date: Date; label: string; width: number }[] = []
    const current = new Date(minDate)
    
    while (current <= maxDate) {
      if (viewMode === 'month') {
        columnsList.push({
          date: new Date(current),
          label: current.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          width: MONTH_WIDTH
        })
        current.setMonth(current.getMonth() + 1)
      } else if (viewMode === 'quarter') {
        const quarter = Math.floor(current.getMonth() / 3) + 1
        const year = current.getFullYear().toString().slice(-2)
        columnsList.push({
          date: new Date(current), 
          label: `Q${quarter} '${year}`,
          width: 300 
        })
        current.setMonth(current.getMonth() + 3)
      } else {
        columnsList.push({
          date: new Date(current),
          label: current.getFullYear().toString(),
          width: 600 
        })
        current.setFullYear(current.getFullYear() + 1)
      }
    }

    return {
      allTasks: tasks,
      columns: columnsList,
      dateRange: { start: minDate, end: maxDate }
    }
  }, [project.lists, statusFilter, viewMode])

  const totalWidth = columns.reduce((acc, col) => acc + col.width, 0)

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

  // Prepare data for TaskDetailSheet (mapped to simplified structure if needed)
  // For now passing raw tasks since IDs match. 
  // We need a list of all tasks for dependencies dropdown in the sheet.
  const allTasksSimple = allTasks.map(t => ({ id: t.id, title: t.title }))
  const allListsSimple = project.lists.map(l => ({ id: l.id, name: l.name }))

  return (
    <div className="flex flex-col h-full bg-background">
      <TimelineToolbar 
        viewMode={viewMode}
        setViewMode={setViewMode}
        onTodayClick={scrollToToday}
        taskCount={allTasks.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <TimelineSidebar 
          statuses={statuses}
          tasksByStatus={tasksByStatus}
          rowHeight={ROW_HEIGHT}
        />

        <TimelineGrid 
          ref={containerRef}
          statuses={statuses}
          tasksByStatus={tasksByStatus}
          columns={columns}
          totalWidth={totalWidth}
          dateRange={dateRange}
          rowHeight={ROW_HEIGHT}
          viewMode={viewMode}
          onTaskClick={setSelectedTaskId}
        />
      </div>

      <TaskDetailSheet
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        statuses={statuses}
        tags={tags}
        users={users}
        currentUserId={currentUserId}
        allTasks={allTasksSimple}
        lists={allListsSimple}
      />
    </div>
  )
}
