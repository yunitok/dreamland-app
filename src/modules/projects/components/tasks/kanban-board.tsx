'use client'

import { useState, useMemo, useTransition, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { Input } from '@/modules/shared/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  GripVertical,
  Tags as TagsIcon,
  Columns3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { TaskDetailSheet } from './task-detail-sheet'
import { CreateTaskDialog } from './create-task-dialog'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TagManagerDialog } from '@/modules/projects/components/tags/tag-manager-dialog'
import { updateTaskStatus, moveTask } from '@/modules/projects/actions/tasks'
import { toast } from 'sonner'

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
  const [hiddenStatusIds, setHiddenStatusIds] = useState<Set<string>>(new Set())
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Optimistic updates: track temporary task status changes
  const [optimisticMoves, setOptimisticMoves] = useState<Map<string, string>>(new Map())

  // Group all tasks by status, applying optimistic moves
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

    // Group by status, applying optimistic moves
    const grouped: Record<string, Task[]> = {}
    statuses.forEach(status => {
      grouped[status.id] = filteredTasks.filter(task => {
        // Check if this task has an optimistic move
        const optimisticStatusId = optimisticMoves.get(task.id)
        const effectiveStatusId = optimisticStatusId || task.status.id
        return effectiveStatusId === status.id
      })
    })
    return grouped
  }, [project.lists, statuses, searchQuery, selectedTag, optimisticMoves])

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

  // Custom collision detection that prioritizes droppable columns
  const customCollisionDetection: CollisionDetection = (args) => {
    // First, try pointerWithin - this is more precise for container detection
    const pointerCollisions = pointerWithin(args)

    if (pointerCollisions.length > 0) {
      // Prioritize column (status) collisions over task collisions
      const columnCollision = pointerCollisions.find(
        collision => statuses.some(s => s.id === collision.id)
      )
      if (columnCollision) {
        return [columnCollision]
      }
      return pointerCollisions
    }

    // Fallback to rectIntersection for edge cases
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      const columnCollision = rectCollisions.find(
        collision => statuses.some(s => s.id === collision.id)
      )
      if (columnCollision) {
        return [columnCollision]
      }
      return rectCollisions
    }

    // Final fallback to closestCorners
    return closestCorners(args)
  }

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
    const { active } = event

    // Use the overColumnId tracked by handleDragOver
    const targetStatusId = overColumnId
    const activeId = active.id as string

    // Reset the over column tracker
    setOverColumnId(null)
    setActiveTask(null)

    if (targetStatusId && activeTask && activeTask.status.id !== targetStatusId) {
      const targetStatus = statuses.find(s => s.id === targetStatusId)

      // Client-side validation: Tasks without assignee can only be in Backlog
      const isMovingToNonBacklog = targetStatus && targetStatus.name !== 'Backlog'
      if (!activeTask.assignee && isMovingToNonBacklog) {
        toast.warning(t('assigneeRequiredToMove'), {
          description: t('assignTaskFirstDescription'),
          duration: 5000
        })
        return
      }

      // OPTIMISTIC UPDATE: Immediately move the task visually
      setOptimisticMoves(prev => new Map(prev).set(activeId, targetStatusId))

      // Call server in background
      try {
        await updateTaskStatus(activeId, targetStatusId)
        // DON'T clear optimistic move on success - let server revalidation handle it
        // The optimistic state will be overwritten by fresh server data
        toast.success(t('taskMoved'))
      } catch (error) {
        // REVERT: Remove the optimistic move to restore original position
        setOptimisticMoves(prev => {
          const next = new Map(prev)
          next.delete(activeId)
          return next
        })
        console.error('Failed to update task status:', error)
        const errorMessage = error instanceof Error ? error.message : t('failedToMoveTask')
        toast.error(t('errorMovingTask'), {
          description: errorMessage,
          duration: 5000
        })
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) {
      setOverColumnId(null)
      return
    }

    const overId = over.id as string
    const activeId = active.id as string

    // Ignore if hovering over yourself
    if (overId === activeId) {
      return // Keep the previously detected column
    }

    // Check if we're over a column directly (status ID)
    const directStatus = statuses.find(s => s.id === overId)
    if (directStatus) {
      setOverColumnId(directStatus.id)
      return
    }

    // If we're over a task (not ourselves), find which column that task belongs to
    for (const [statusId, tasks] of Object.entries(tasksByStatus)) {
      const foundTask = tasks.find(t => t.id === overId && t.id !== activeId)
      if (foundTask) {
        setOverColumnId(statusId)
        return
      }
    }
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

          {/* Column Visibility Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                <Columns3 className="h-4 w-4 mr-2" />
                {t('columns')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.id}
                  checked={!hiddenStatusIds.has(status.id)}
                  onCheckedChange={(checked) => {
                    setHiddenStatusIds(prev => {
                      const newSet = new Set(prev)
                      if (checked) {
                        newSet.delete(status.id)
                      } else {
                        newSet.add(status.id)
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {t(`statuses.${status.name}`)}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">
          {totalTasks} {t('tasks')}
        </span>
      </div>

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-h-[500px]">
            {statuses
              .filter(status => !hiddenStatusIds.has(status.id))
              .map(status => (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  tasks={tasksByStatus[status.id] || []}
                  onTaskClick={setSelectedTask}
                  onAddTask={() => handleCreateTask(status.id)}
                  onHideColumn={() => {
                    setHiddenStatusIds(prev => new Set(prev).add(status.id))
                  }}
                />
              ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <KanbanCard
              task={activeTask}
              onClick={() => { }}
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
