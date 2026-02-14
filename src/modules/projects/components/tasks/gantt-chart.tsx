'use client'

import { useState, useMemo } from 'react'
import { TaskDetailSheet } from './task-detail-sheet'
import { Task } from './types'
import { GanttToolbar } from './gantt/gantt-toolbar'
import { GanttSidebar } from './gantt/gantt-sidebar'
import { GanttGrid } from './gantt/gantt-grid'

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
  statuses: Array<{ id: string; name: string; color: string; isClosed: boolean; isDefault: boolean }>
  tags: Array<{ id: string; name: string; color: string; projectId: string }>
  users: Array<{ id: string; name: string | null; image: string | null; username: string }>
  currentUserId: string
}

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 60

export function GanttChart({ project, statuses, tags, users, currentUserId }: GanttChartProps) {
  const [zoom, setZoom] = useState(1)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
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

  // Prepare simple data for TaskDetailSheet
  const allTasksSimple = allTasks.map(t => ({ id: t.id, title: t.title }))
  const allListsSimple = project.lists.map(l => ({ id: l.id, name: l.name }))

  // Mock scroll state for syncing
  // In a real implementation this would need state lifting or context
  const [scrollTop, setScrollTop] = useState(0)

  return (
    <div className="flex flex-col h-full bg-background">
      <GanttToolbar 
        zoom={zoom} 
        setZoom={setZoom} 
        onTodayClick={() => {}} // TODO: Implement scroll specific logic
      />

      <div className="flex-1 flex overflow-hidden">
        <GanttSidebar 
          project={project}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
          scrollTop={scrollTop}
        />

        <GanttGrid 
          lists={project.lists}
          dateRange={dateRange}
          dayCount={dayCount}
          zoom={zoom}
          onTaskClick={setSelectedTaskId}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
          onScroll={setScrollTop}
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
