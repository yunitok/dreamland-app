'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  GripVertical,
  Tags as TagsIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { TaskDetailSheet } from './task-detail-sheet'
import { CreateTaskDialog } from './create-task-dialog'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TagManagerDialog } from '@/components/tags/tag-manager-dialog'
import { updateTaskStatus, moveTask } from '@/lib/actions/tasks'

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
  tags: Array<{ id: string; name: string; color: string; projectId: string }>
  _count: {
    subtasks: number
    comments: number
    attachments: number
  }
  listId: string
}

interface TaskList {
  id: string
  name: string
  color: string | null
  tasks: Task[]
}

interface KanbanBoardProps {
  project: {
    id: string
    title: string
    lists: TaskList[]
  }
  statuses: Array<{ id: string; name: string; color: string; isClosed: boolean; isDefault: boolean }>
  tags: Array<{ id: string; name: string; color: string; projectId: string }>
  users: Array<{ id: string; name: string | null; image: string | null; username: string }>
  currentUserId: string
}

export function KanbanBoard({ project, statuses, tags, users, currentUserId }: KanbanBoardProps) {
  const t = useTranslations('tasks')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForStatusId, setCreateForStatusId] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  // Group all tasks by status
  const tasksByStatus = useMemo(() => {
    const allTasks = project.lists.flatMap(list => 
      list.tasks.map(task => ({ ...task, listId: list.id }))
    )
    
    // Filter by search query and tags
    const filteredTasks = allTasks.filter(task => {
        const matchesSearch = !searchQuery || 
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesTag = selectedTag === 'all' || 
          task.tags.some(t => t.id === selectedTag)

        return matchesSearch && matchesTag
    })

    // Group by status
    const grouped: Record<string, Task[]> = {}
    statuses.forEach(status => {
      grouped[status.id] = filteredTasks.filter(task => task.status.id === status.id)
    })
    return grouped
  }, [project.lists, statuses, searchQuery, selectedTag])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const taskId = active.id as string
    
    // Find the task across all statuses
    for (const tasks of Object.values(tasksByStatus)) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setActiveTask(task)
        break
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setActiveTask(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column (status)
    const targetStatus = statuses.find(s => s.id === overId)
    
    if (targetStatus && activeTask && activeTask.status.id !== targetStatus.id) {
      // Update task status
      try {
        await updateTaskStatus(activeId, targetStatus.id)
      } catch (error) {
        console.error('Failed to update task status:', error)
      }
    }

    setActiveTask(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Handle visual feedback during drag
  }

  const handleCreateTask = (statusId: string) => {
    setCreateForStatusId(statusId)
    setIsCreateOpen(true)
  }

  const totalTasks = Object.values(tasksByStatus).reduce((sum, tasks) => sum + tasks.length, 0)
  const defaultStatus = statuses.find(s => s.isDefault) || statuses[0]
  const firstList = project.lists[0]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchTasks')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          
          {/* Tag Filter */}
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full sm:w-[180px] h-10">
               <div className="flex items-center gap-2">
                 <TagsIcon className="w-4 h-4 text-muted-foreground" />
                 <SelectValue placeholder={t('filterByTag')} />
               </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTags')}</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: tag.color }} 
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          

        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">
          {totalTasks} {t('tasks')}
        </span>
      </div>

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-h-[500px]">
            {statuses.map(status => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={tasksByStatus[status.id] || []}
                onTaskClick={setSelectedTask}
                onAddTask={() => handleCreateTask(status.id)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <KanbanCard
              task={activeTask}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

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
        onClose={() => setIsCreateOpen(false)}
        projectId={project.id}
        listId={firstList?.id || null}
        defaultStatusId={createForStatusId || defaultStatus?.id}
        statuses={statuses}
        tags={tags}
        users={users}
      />

    </div>
  )
}
