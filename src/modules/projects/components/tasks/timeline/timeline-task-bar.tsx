import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import { Task } from '../types'

interface TimelineTaskBarProps {
  task: Task
  style: React.CSSProperties
  onClick: (taskId: string) => void
  color: string
}

export function TimelineTaskBar({ task, style, onClick, color }: TimelineTaskBarProps) {
  return (
    <div
      className="absolute h-6 rounded-md cursor-pointer hover:opacity-90 transition-all group"
      style={{
        ...style,
        minWidth: 20,
        backgroundColor: color,
      }}
      onClick={() => onClick(task.id)}
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
}
