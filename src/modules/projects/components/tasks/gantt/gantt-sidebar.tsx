import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import { cn } from '@/lib/utils'
import { Task } from '../types'

interface TaskList {
  id: string
  name: string
  color: string | null
  tasks: Task[]
}

interface GanttSidebarProps {
  project: {
    lists: TaskList[]
  }
  rowHeight: number
  headerHeight: number
  scrollTop: number
}

export function GanttSidebar({ project, rowHeight, headerHeight, scrollTop }: GanttSidebarProps) {
  return (
    <div className="w-[300px] min-w-[300px] border-r flex flex-col bg-background z-20">
      {/* Header */}
      <div 
        className="border-b flex items-end px-3 pb-2 bg-muted/30"
        style={{ height: headerHeight }}
      >
        <span className="text-sm font-medium">Task</span>
      </div>
      
      {/* Scrollable Content (Syncs with grid via parent) */}
      <div className="flex-1 overflow-hidden pointer-events-none">
        <div 
          className="transform"
          style={{ transform: `translateY(-${scrollTop}px)` }}
        >
          {project.lists.map(list => (
            <div key={list.id}>
              {/* List Header */}
              <div 
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b text-sm font-medium"
                style={{ height: rowHeight }}
              >
                <div 
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: list.color || '#6B7280' }}
                />
                {list.name}
              </div>
              
              {/* Tasks */}
              {list.tasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center gap-2 px-3 border-b bg-background"
                  style={{ height: rowHeight }}
                >
                  <span 
                    className={cn(
                      "text-sm truncate flex-1",
                      task.parentId && "pl-4",
                      task.status.isClosed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.assignee && (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee.image || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {task.assignee.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
