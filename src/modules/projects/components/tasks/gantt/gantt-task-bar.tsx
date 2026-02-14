import { Task } from '../types'

interface GanttTaskBarProps {
  task: Task
  style: React.CSSProperties
  onClick: (taskId: string) => void
}

export function GanttTaskBar({ task, style, onClick }: GanttTaskBarProps) {
  return (
    <div
      className="absolute top-1 bottom-1 rounded-md cursor-pointer hover:opacity-90 transition-opacity z-10"
      style={{
        ...style,
        backgroundColor: task.status.color,
      }}
      onClick={() => onClick(task.id)}
    >
      {/* Progress fill */}
      <div 
        className="absolute inset-0 rounded-md bg-black/20"
        style={{ 
          width: `${task.progress}%`,
        }}
      />
      
      {/* Task title (if bar is wide enough) */}
      {(parseInt(style.width as string) || 0) > 60 && (
        <span className="absolute inset-0 px-2 flex items-center text-xs text-white font-medium truncate">
          {task.title}
        </span>
      )}
    </div>
  )
}
