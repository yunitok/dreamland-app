'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { KanbanCard } from './kanban-card'

interface Task {
  id: string
  title: string
  description: string | null
  progress: number
  storyPoints: number | null
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
  _count: {
    subtasks: number
    comments: number
    attachments: number
  }
}

interface KanbanColumnProps {
  status: {
    id: string
    name: string
    color: string
    isClosed: boolean
  }
  tasks: Task[]
  onTaskClick: (taskId: string) => void
  onAddTask: () => void
}

export function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const t = useTranslations('tasks')
  
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div 
      className={cn(
        "flex flex-col w-[320px] min-w-[320px] h-full rounded-xl bg-muted/30 border transition-colors",
        isOver && "bg-muted/50 border-primary/50"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div 
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <h3 className="font-medium text-sm flex-1 truncate">{status.name}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Tasks Container */}
      <div 
        ref={setNodeRef}
        className="flex-1 p-2 overflow-y-auto space-y-2"
      >
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            {t('noTasks')}
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="p-2 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onAddTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addTask')}
        </Button>
      </div>
    </div>
  )
}
