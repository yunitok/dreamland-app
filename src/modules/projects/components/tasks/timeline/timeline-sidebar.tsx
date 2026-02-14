import { Badge } from '@/modules/shared/ui/badge'
import { Task } from '../types'

interface TimelineSidebarProps {
  statuses: Array<{ id: string; name: string; color: string }>
  tasksByStatus: Record<string, Task[]>
  rowHeight: number
}

export function TimelineSidebar({ 
  statuses, 
  tasksByStatus,
  rowHeight
}: TimelineSidebarProps) {
  return (
    <div className="w-[200px] min-w-[200px] border-r flex flex-col bg-muted/20">
      {/* Header spacer */}
      <div className="h-[40px] border-b" />
      
      {/* Status rows */}
      {statuses.map(status => (
        <div
          key={status.id}
          className="border-b flex items-center gap-2 px-3"
          style={{ height: Math.max(rowHeight, (tasksByStatus[status.id]?.length || 1) * 28 + 20) }}
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
  )
}
