'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Paperclip, 
  Calendar,
  CheckSquare,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface KanbanCardProps {
  task: Task
  onClick: () => void
  isDragging?: boolean
}

export function KanbanCard({ task, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status.isClosed

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-card rounded-lg border shadow-sm cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/30",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg rotate-2",
        isDragging && "opacity-100 shadow-xl"
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="px-3 pb-3 -mt-1">
        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map(tag => (
              <Badge 
                key={tag.id}
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-4"
                style={{ 
                  backgroundColor: `${tag.color}15`,
                  borderColor: `${tag.color}40`,
                  color: tag.color
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{task.tags.length - 3}
              </span>
            )}
            
            {/* Agile Story Points */}
            {task.storyPoints !== null && task.storyPoints > 0 && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
              >
                {task.storyPoints} pts
              </Badge>
            )}
          </div>
        )}

        {/* Title */}
        <h4 className={cn(
          "font-medium text-sm mb-2 line-clamp-2",
          task.status.isClosed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </h4>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Progress bar */}
        {task.progress > 0 && (
          <div className="mb-3">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <div className="flex items-center gap-2 text-xs">
            {task._count.subtasks > 0 && (
              <span className="flex items-center gap-0.5">
                <CheckSquare className="h-3 w-3" />
                {task._count.subtasks}
              </span>
            )}
            {task._count.comments > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {task._count.comments}
              </span>
            )}
            {task._count.attachments > 0 && (
              <span className="flex items-center gap-0.5">
                <Paperclip className="h-3 w-3" />
                {task._count.attachments}
              </span>
            )}
            {task.dueDate && (
              <span className={cn(
                "flex items-center gap-0.5",
                isOverdue && "text-red-500"
              )}>
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>

          {/* Assignee */}
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.image || undefined} />
              <AvatarFallback className="text-[10px]">
                {task.assignee.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  )
}
