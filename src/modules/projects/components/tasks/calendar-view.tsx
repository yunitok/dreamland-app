'use client'

import { useState, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useTranslations, useLocale } from 'next-intl'
import { TaskDetailSheet } from './task-detail-sheet'
import { CreateTaskDialog } from './create-task-dialog'
import '@fullcalendar/core/locales/es'

interface Task {
  id: string
  title: string
  description: string | null
  startDate: Date | null
  dueDate: Date | null
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
  tags: Array<{ id: string; name: string; color: string }>
}

interface TaskList {
  id: string
  name: string
  tasks: Task[]
}

interface CalendarViewProps {
  project: {
    id: string
    title: string
    lists: TaskList[]
  }
  statuses: Array<{ id: string; name: string; color: string; isClosed: boolean; isDefault: boolean }>
  tags: Array<{ id: string; name: string; color: string }>
  users: Array<{ id: string; name: string | null; image: string | null; username: string }>
  currentUserId: string
}

export function CalendarView({ project, statuses, tags, users, currentUserId }: CalendarViewProps) {
  const t = useTranslations('tasks')
  const locale = useLocale()
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)

  // Convert tasks to calendar events
  const events = useMemo(() => {
    const allTasks = project.lists.flatMap(list => list.tasks)
    
    return allTasks
      .filter(task => task.dueDate || task.startDate)
      .map(task => ({
        id: task.id,
        title: task.title,
        start: (task.startDate || task.dueDate) as Date,
        end: (task.dueDate || task.startDate) as Date,
        backgroundColor: task.status.color,
        borderColor: task.status.color,
        textColor: '#ffffff',
        extendedProps: {
          task,
        },
        classNames: task.status.isClosed ? ['opacity-50', 'line-through'] : [],
      }))
  }, [project.lists])

  const handleDateClick = (info: { date: Date }) => {
    setCreateDate(info.date)
    setIsCreateOpen(true)
  }

  const handleEventClick = (info: { event: { id: string } }) => {
    setSelectedTask(info.event.id)
  }

  const defaultStatus = statuses.find(s => s.isDefault) || statuses[0]
  const firstList = project.lists[0]

  return (
    <div className="p-4 h-full">
      <div className="bg-card rounded-xl border p-4 h-full">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={locale}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="100%"
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
        />
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        taskId={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        statuses={statuses}
        tags={tags}
        users={users}
        currentUserId={currentUserId}
        lists={project.lists}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setCreateDate(null)
        }}
        projectId={project.id}
        listId={firstList?.id || null}
        defaultStatusId={defaultStatus?.id}
        statuses={statuses}
        tags={tags}
        users={users}
      />
    </div>
  )
}
