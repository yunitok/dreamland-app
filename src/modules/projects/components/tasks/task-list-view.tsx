/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo, useEffect } from 'react'
import * as React from 'react'
import {
  DndContext, 
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shared/ui/table'
import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { Input } from '@/modules/shared/ui/input'
import { Checkbox } from '@/modules/shared/ui/checkbox'
import { Separator } from '@/modules/shared/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shared/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/modules/shared/ui/dropdown-menu'
import { 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
  Filter,
  FolderKanban,
  X,
  Link2,
  ArrowRight,
  GripVertical,
  Tags
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { TaskDetailSheet } from './task-detail-sheet'
import { CreateTaskDialog } from './create-task-dialog'
import { CreateListDialog } from './create-list-dialog'
import { EditListDialog } from './edit-list-dialog'
import { DeleteListDialog } from './delete-list-dialog'
import { TagManagerDialog } from '../tags/tag-manager-dialog'
import { createDefaultLists, deleteTasks, deleteTask, moveTask, updateTask } from '@/modules/projects/actions/tasks'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Task {
  id: string
  title: string
  listId: string
  position: number
  description: string | null
  progress: number
  startDate: Date | null
  dueDate: Date | null
  estimatedHours: number | null
  storyPoints: number | null
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
  _count?: {
    subtasks: number
    comments: number
    attachments: number
  }
  subtasks?: Task[]
  predecessors?: any[]
  successors?: any[]
}

interface TaskList {
  id: string
  name: string
  color: string | null
  projectId: string
  tasks: Task[]
}

interface TaskListViewProps {
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

export function TaskListView({ project, statuses, tags, users, currentUserId }: TaskListViewProps) {
  const t = useTranslations('tasks')
  const [groupBy, setGroupBy] = useState<'list' | 'status'>('list')
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  useEffect(() => {
     const start = performance.now()
     setTasks(project.lists.flatMap(l => l.tasks))
     // Use setTimeout to measure after render cycle completes
     setTimeout(() => {
        console.log(`[PERF-CLIENT] TaskListView mount+render: ${(performance.now() - start).toFixed(2)}ms`)
     }, 0)
  }, [project.lists])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [expandedLists, setExpandedLists] = useState<Set<string>>(
    new Set(project.lists.map(l => l.id))
  )
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  
  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreateListOpen, setIsCreateListOpen] = useState(false)
  const [editingList, setEditingList] = useState<{id: string, name: string, color: string | null} | null>(null)
  const [deletingList, setDeletingList] = useState<{id: string, name: string, taskCount: number} | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  
  const [createInListId, setCreateInListId] = useState<string | null>(null)
  const [createInStatusId, setCreateInStatusId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [isTagsOpen, setIsTagsOpen] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const router = useRouter()

  const groupedTasks = useMemo(() => {
    if (groupBy === 'list') {
      return project.lists.map(list => ({
        id: list.id,
        name: list.name,
        color: list.color,
        tasks: tasks.filter(t => t.listId === list.id).sort((a,b) => a.position - b.position),
        isCustomList: true
      }))
    }
    
    // Group by status
    return statuses.map(status => ({
      id: status.id,
      name: status.name,
      color: status.color,
      tasks: tasks.filter(t => t.status.id === status.id), // Status sorting?
      isCustomList: false
    }))
  }, [groupBy, project.lists, statuses, tasks])

  const toggleList = (listId: string) => {
    const newExpanded = new Set(expandedLists)
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId)
    } else {
      newExpanded.add(listId)
    }
    setExpandedLists(newExpanded)
  }

  const allListsExpanded = useMemo(() => {
    const currentGroupIds = groupedTasks.map(g => g.id)
    return currentGroupIds.every(id => expandedLists.has(id))
  }, [expandedLists, groupedTasks])

  const toggleAllLists = () => {
    if (allListsExpanded) {
      setExpandedLists(new Set())
    } else {
      const allIds = groupedTasks.map(g => g.id)
      setExpandedLists(new Set(allIds))
    }
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    })
  }

  const filterTasks = (tasks: Task[]): Task[] => {
    return tasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      
      // Status filter
      if (statusFilter !== 'all' && task.status.id !== statusFilter) {
        return false
      }
      
      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' && task.assignee) return false
        if (assigneeFilter !== 'unassigned' && task.assignee?.id !== assigneeFilter) return false
      }
      
      // Tag filter
      if (selectedTag !== 'all') {
        if (!task.tags.some(t => t.id === selectedTag)) return false
      }

      return true
    })
  }

  const totalTasks = project.lists.reduce((sum, list) => sum + list.tasks.length, 0)

  const handleCreateTask = (listId?: string, statusId?: string) => {
    setCreateInListId(listId || project.lists[0]?.id || null)
    setCreateInStatusId(statusId || null)
    setIsCreateOpen(true)
  }

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return
    setIsBulkDeleting(true)
    try {
      await deleteTasks(Array.from(selectedTasks))
      toast.success(t('tasksDeleted', { count: selectedTasks.size }))
      setSelectedTasks(new Set())
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete tasks')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const defaultStatus = statuses.find(s => s.isDefault) || statuses[0]

  const handleInitializeBoard = async () => {
    setIsInitializing(true)
    try {
      await createDefaultLists(project.id)
      toast.success(t('boardInitialized'))
      router.refresh()
    } catch (error) {
      toast.error('Failed to initialize board')
      console.error(error)
    } finally {
      setIsInitializing(false)
    }
  }

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveTask(active.data.current?.task as Task)
  }

  const handleDragOver = (event: DragOverEvent) => {
     // Optimistic updates are strictly for visual reordering
     // For a list view, exact reordering is complex because of grouping.
     // We can skip complex onDragOver reordering and rely on onDragEnd for the commit
     // BUT dnd-kit visual feedback works best if the items actually move in the DOM.
     // Given the grouping (derived from state), if we update the task properties (listId/statusId) in `tasks` state, it will jump to the new group.
     const { active, over } = event
     if (!over) return

     const activeId = active.id as string
     const overId = over.id as string
     
     if (activeId === overId) return

     // Find the containers (Group IDs)
     // The `SortableContext` should probably be the tasks themselves.
     // Dropping ONTO a task in another group vs ONTO the group header/empty area.
     // We need to know which group the `over` element belongs to.
     
     // Simplification: Let's only handle DragEnd for the logical move first.
     // To allow dragging between lists, we need the "over" target to tell us the new list.
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    
    // Find source and destination
    const activeTaskIndex = tasks.findIndex(t => t.id === activeId)
    const activeTask = tasks[activeTaskIndex]
    
    if (!activeTask) return

    // Identify target group
    // If overId is a Task ID, we get its group.
    // If overId is a Group ID (container), we move to that group.
    let targetGroupId: string | undefined
    let targetTaskId: string | undefined
    
    // Check if over a task
    const overTask = tasks.find(t => t.id === overId)
    
    if (overTask) {
       targetGroupId = groupBy === 'list' ? overTask.listId : overTask.status.id
       targetTaskId = overTask.id
    } else {
       // Check if over a container (we need to make containers droppable)
       // Assuming container ID is the List ID or Status ID
       const isGroup = project.lists.some(l => l.id === overId) || statuses.some(s => s.id === overId)
       if (isGroup) {
         targetGroupId = overId
       }
    }

    if (!targetGroupId) return

    // Check if group changed
    const currentGroupId = groupBy === 'list' ? activeTask.listId : activeTask.status.id
    const isDifferentGroup = currentGroupId !== targetGroupId

    // Optimistic Update
    const newTasks = [...tasks]
    const taskIndex = newTasks.findIndex(t => t.id === activeId)
    if (taskIndex !== -1) {
       if (groupBy === 'list') {
         newTasks[taskIndex] = { ...newTasks[taskIndex], listId: targetGroupId }
       } else {
         // Need to find the status object
         const newStatus = statuses.find(s => s.id === targetGroupId)
         if (newStatus) {
            newTasks[taskIndex] = { ...newTasks[taskIndex], status: { ...newTasks[taskIndex].status, ...newStatus } }
         }
       }
       setTasks(newTasks)
    }

    // Update Server
    try {
      if (groupBy === 'list') {
         if (isDifferentGroup) {
            // Move to new list
            await moveTask(activeId, targetGroupId, 0) 
            toast.success('Task moved')
         }
      } else if (groupBy === 'status') {
         if (isDifferentGroup) {
            await updateTask(activeId, { statusId: targetGroupId })
             toast.success('Task status updated')
         }
      }
    } catch (error) {
      toast.error('Failed to move task')
      // Rollback
      setTasks(tasks) // Reset to original
    }
  }


  // Initialize expanded sets when grouping changes
  useMemo(() => {
    const listIds = groupBy === 'list' 
      ? project.lists.map(l => l.id)
      : statuses.map(s => s.id)
    setExpandedLists(new Set(listIds))
  }, [groupBy, project.lists, statuses]) // tasks removed from dependency to prevent collapse on drag? No, expansion state should be stable.

  if (project.lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 border rounded-xl bg-card/30 border-dashed m-6">
        <div className="p-4 rounded-full bg-primary/10 text-primary mb-2">
          <FolderKanban className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold">Start your Project Board</h3>
        <p className="text-muted-foreground max-w-md">
          This project doesn&apos;t have any task lists yet. Initialize the board to start creating and managing tasks.
        </p>
        <Button onClick={handleInitializeBoard} disabled={isInitializing}>
          {isInitializing ? (
            <>Initializing...</>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Initialize Board
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 pb-24">
      {/* Toolfoo */}
      <div className="flex flex-col gap-4">
        {/* Search - Full width on mobile */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        
        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2">
          {/* Group By Selector */}
          <div className="col-span-1 md:w-auto">
            <Select value={groupBy} onValueChange={(v: 'list' | 'status') => setGroupBy(v)}>
              <SelectTrigger className="w-full lg:w-[180px] h-10">
                <FolderKanban className="h-4 w-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder={t('groupBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">{t('groupByList')}</SelectItem>
                <SelectItem value="status">{t('groupByStatus')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 shrink-0 cursor-pointer"
            onClick={toggleAllLists}
            title={allListsExpanded ? t('collapseAll') || 'Collapse All' : t('expandAll') || 'Expand All'}
          >
            {allListsExpanded ? (
              <ChevronsDownUp className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </Button>

          <Separator orientation="vertical" className="hidden lg:block h-8" />

          {/* Status Filter */}
          <div className="col-span-1 md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px] h-10">
                <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filter */}
          <div className="col-span-1 md:w-auto">
             <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-full lg:w-[200px] h-10">
                 <div className="flex items-center gap-2 truncate">
                   <Tags className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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

          {/* Assignee Filter */}
          <div className="col-span-1 md:w-auto">
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full lg:w-[180px] h-10">
                <SelectValue placeholder={t('assignee')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAssignees')}</SelectItem>
                <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="col-span-1 sm:col-span-2 lg:ml-auto flex flex-wrap items-center justify-between lg:justify-end gap-2 mt-2 lg:mt-0">
             <Button variant="outline" size="sm" onClick={() => setIsTagsOpen(true)} className="h-10">
              <Tags className="w-4 h-4 mr-2" />
              {t('manageTags') || 'Manage Tags'} 
            </Button>
            
            <span className="text-xs text-muted-foreground mr-2 hidden xl:inline">
              {totalTasks} {t('tasks')}
            </span>
            <div className="flex items-center gap-2">
              {groupBy === 'list' && (
                <Button variant="outline" size="sm" onClick={() => setIsCreateListOpen(true)} className="h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>{t('newList')}</span>
                </Button>
              )}
              <Button size="sm" onClick={() => handleCreateTask()} className="h-10">
                <Plus className="h-4 w-4 mr-2" />
                <span>{t('newTask')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Task Lists / Groups */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {groupedTasks.map((group) => {
            const isExpanded = expandedLists.has(group.id)
            const filteredTasks = filterTasks(group.tasks)

            return (
              <TaskListGroup
                key={group.id}
                group={group}
                isExpanded={isExpanded}
                filteredTasks={filteredTasks}
                toggleList={toggleList}
                groupBy={groupBy}
                handleCreateTask={handleCreateTask}
                t={t}
                setEditingList={setEditingList}
                setDeletingList={setDeletingList}
                expandedTasks={expandedTasks}
                selectedTasks={selectedTasks}
                toggleTask={toggleTask}
                toggleTaskSelection={toggleTaskSelection}
                setSelectedTask={setSelectedTask}
                formatDate={formatDate}
                projectLists={project.lists.map(l => ({ id: l.id, name: l.name, color: l.color, projectId: l.projectId }))}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                assigneeFilter={assigneeFilter}
              />
            )
          })}
        </div>
        
        <DragOverlay>
          {activeTask ? (
             <Table>
               <TableBody>
                 <TaskRow
                    task={activeTask}
                    level={0}
                    isExpanded={false}
                    isSelected={false}
                    onToggle={() => {}}
                    onSelect={() => {}}
                    onClick={() => {}}
                    formatDate={formatDate}
                    lists={project.lists.map(l => ({ id: l.id, name: l.name, color: l.color }))}
                    className="bg-background border rounded-lg shadow-xl opacity-80"
                 />
               </TableBody>
             </Table>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bulk Action Bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium whitespace-nowrap">
            {t('selected', { count: selectedTasks.size })}
          </span>
          <Separator orientation="vertical" className="h-4 bg-background/20" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 hover:bg-background/20 hover:text-background"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isBulkDeleting ? t('deleting') : t('delete')}
          </Button>
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-6 w-6 ml-2 hover:bg-background/20 hover:text-background rounded-full"
             onClick={() => setSelectedTasks(new Set())}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <TaskDetailSheet
        taskId={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        statuses={statuses}
        tags={tags}
        users={users}
        currentUserId={currentUserId}
        allTasks={groupedTasks.flatMap(g => g.tasks).map(t => ({ id: t.id, title: t.title }))} // Pass all tasks for dependencies
        lists={project.lists.map(l => ({ id: l.id, name: l.name }))}
      />

      <CreateTaskDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={project.id}
        listId={createInListId}
        defaultStatusId={createInStatusId || defaultStatus?.id}
        statuses={statuses}
        tags={tags}
        users={users}
      />

      <CreateListDialog
        isOpen={isCreateListOpen}
        onClose={() => setIsCreateListOpen(false)}
        projectId={project.id}
      />

      <EditListDialog
        isOpen={!!editingList}
        onClose={() => setEditingList(null)}
        list={editingList}
      />

      <DeleteListDialog
        isOpen={!!deletingList}
        onClose={() => setDeletingList(null)}
        list={deletingList}
      />

      <TagManagerDialog
        open={isTagsOpen}
        onOpenChange={setIsTagsOpen}
        tags={tags}
        projectId={project.id}
      />
    </div>
  )
}

// Droppable List Group Component
function TaskListGroup({ 
  group, 
  isExpanded, 
  filteredTasks, 
  toggleList, 
  groupBy, 
  handleCreateTask, 
  t, 
  setEditingList, 
  setDeletingList, 
  expandedTasks,
  selectedTasks,
  toggleTask,
  toggleTaskSelection,
  setSelectedTask,
  formatDate,
  projectLists,
  searchQuery,
  statusFilter,
  assigneeFilter
}: any) {
  const { setNodeRef } = useDroppable({
    id: group.id,
    data: { type: 'container', id: group.id }
  })

  return (
    <div 
      ref={setNodeRef}
      className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* List Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => toggleList(group.id)}
      >
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <div 
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: group.color || '#6B7280' }}
        />
        <h3 className="font-semibold">{group.name}</h3>
        <Badge variant="secondary" className="text-xs">
          {group.tasks.length}
        </Badge>
        
        <div className="ml-auto flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7"
            onClick={(e) => {
              e.stopPropagation()
              if (groupBy === 'list') {
                handleCreateTask(group.id, undefined)
              } else {
                handleCreateTask(undefined, group.id)
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('addTask')}
          </Button>

          {/* List Actions Menu */}
          {group.isCustomList && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                  e.stopPropagation()
                  setEditingList({ id: group.id, name: group.name, color: group.color })
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('editList')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingList({ id: group.id, name: group.name, taskCount: group.tasks.length })
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('deleteList')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      {isExpanded && (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30px] p-0"></TableHead>
              <TableHead className="w-[30px] p-0"></TableHead>
              <TableHead className="min-w-[200px]">{t('task')}</TableHead>
              <TableHead className="w-[120px] hidden sm:table-cell">{t('status')}</TableHead>
              <TableHead className="w-[100px] hidden md:table-cell">{t('assignee')}</TableHead>
              <TableHead className="w-[100px] hidden lg:table-cell">{t('dueDate')}</TableHead>
              <TableHead className="w-[80px] hidden sm:table-cell">{t('progress')}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' || assigneeFilter !== 'all'
                    ? t('noTasksMatch')
                    : t('noTasks')
                  }
                </TableCell>
              </TableRow>
            ) : (
              <SortableContext 
                items={filteredTasks.map((t: Task) => t.id)} 
                strategy={verticalListSortingStrategy}
                id={group.id} // Important for dnd-kit context
              >
                {filteredTasks.map((task: Task) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    level={0}
                    isExpanded={expandedTasks.has(task.id)}
                    isSelected={selectedTasks.has(task.id)}
                    onToggle={() => toggleTask(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onClick={() => setSelectedTask(task.id)}
                    formatDate={formatDate}
                    lists={projectLists}
                  />
                ))}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function SortableTaskRow({ task, ...props }: TaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: isDragging ? 'relative' as const : undefined
  }

  return (
    <TaskRow 
      ref={setNodeRef} 
      style={style} 
      dragAttributes={attributes}
      dragListeners={listeners}
      task={task} 
      {...props} 
    />
  )
}

interface TaskRowProps {
  task: Task
  level: number
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onSelect: () => void
  onClick: () => void
  formatDate: (date: Date | null) => string
  lists: Array<{ id: string; name: string; color: string | null }>
  style?: React.CSSProperties
  dragAttributes?: any
  dragListeners?: any
}

// Forward ref to allow dnd-kit to attach to the TR
const TaskRow = React.forwardRef<HTMLTableRowElement, TaskRowProps & React.HTMLAttributes<HTMLTableRowElement>>(
  ({ task, level, isExpanded, isSelected, onToggle, onSelect, onClick, formatDate, lists, style, className, dragAttributes, dragListeners, ...props }, ref) => {
  const router = useRouter()
  const hasSubtasks = (task._count?.subtasks || 0) > 0
  const hasDependencies = (task.predecessors?.length || 0) > 0 || (task.successors?.length || 0) > 0

  // ... (handlers kept same)
  const handleDelete = async () => {
    try {
      await deleteTask(task.id)
      toast.success('Task deleted')
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleMove = async (listId: string) => {
    try {
      await moveTask(task.id, listId, 0) // Move to top of target list
      toast.success('Task moved')
      router.refresh()
    } catch (error) {
      toast.error('Failed to move task')
    }
  }

  return (
    <>
      <TableRow 
        ref={ref}
        style={style}
        className={cn(
          "cursor-pointer hover:bg-muted/50 group transition-colors",
          isSelected && "bg-muted/40",
          className
        )}
        onClick={onClick}
        {...props}
      >
        <TableCell className="w-[30px] px-1 py-2">
           <div 
             {...dragAttributes} 
             {...dragListeners} 
             className="cursor-grab hover:text-foreground text-muted-foreground/50 flex items-center justify-center p-1 rounded hover:bg-muted"
             onClick={(e) => e.stopPropagation()}
           >
              <GripVertical className="h-4 w-4" />
           </div>
        </TableCell>
        <TableCell className="py-2">
          {hasSubtasks && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="py-2">
          <div 
            className="flex items-center gap-3"
            style={{ paddingLeft: level * 20 }}
          >
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => onSelect()}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex flex-col min-w-0">
               <div className="flex items-center gap-2">
                 <span className={cn(
                   "font-medium truncate max-w-[250px] sm:max-w-[400px]",
                   task.status.isClosed && "line-through text-muted-foreground"
                 )}>
                   {task.title}
                 </span>
                 {hasDependencies && (
                    <div className="flex items-center text-muted-foreground" title="Has dependencies">
                      <Link2 className="h-3.5 w-3.5" />
                    </div>
                 )}
               </div>
            </div>
            {task.tags.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                {task.tags.slice(0, 2).map(tag => (
                  <Badge 
                    key={tag.id}
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 h-4"
                    style={{ 
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
              {(task._count?.comments || 0) > 0 && (
                <span className="flex items-center gap-0.5 text-xs">
                  <MessageSquare className="h-3 w-3" />
                  {task._count?.comments}
                </span>
              )}
              {(task._count?.attachments || 0) > 0 && (
                <span className="flex items-center gap-0.5 text-xs">
                  <Paperclip className="h-3 w-3" />
                  {task._count?.attachments}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-2 hidden sm:table-cell">
          <Badge
            variant="secondary"
            className="text-xs"
            style={{ 
              backgroundColor: `${task.status.color}20`,
              color: task.status.color
            }}
          >
            {task.status.name}
          </Badge>
        </TableCell>
        <TableCell className="py-2 hidden md:table-cell">
          {task.assignee ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={task.assignee.image || undefined} />
              <AvatarFallback className="text-xs">
                {task.assignee.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </TableCell>
        <TableCell className="py-2 hidden lg:table-cell">
          <span className={cn(
            "text-sm",
            task.dueDate && new Date(task.dueDate) < new Date() && !task.status.isClosed
              ? "text-red-500 font-medium"
              : "text-muted-foreground"
          )}>
            {formatDate(task.dueDate)}
          </span>
        </TableCell>
        <TableCell className="py-2 hidden sm:table-cell">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">
              {task.progress}%
            </span>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem className="cursor-pointer" onClick={() => onClick()}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Task
              </DropdownMenuItem>
              {lists.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Move to...
                  </DropdownMenuLabel>
                  {lists.map(list => (
                      <DropdownMenuItem key={list.id} className="cursor-pointer" onClick={() => handleMove(list.id)}>
                          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: list.color || '#6B7280' }} />
                          {list.name}
                      </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {/* Subtasks */}
      {isExpanded && task.subtasks?.map((subtask) => (
        <TaskRow
          key={subtask.id}
          task={{
            ...subtask,
            _count: { subtasks: 0, comments: 0, attachments: 0 },
            subtasks: []
          }}
          level={level + 1}
          isExpanded={false}
          isSelected={isSelected}
          onSelect={() => onSelect()}
          onToggle={() => {}}
          onClick={onClick}
          formatDate={formatDate}
          lists={lists}
        />
      ))}
    </>
  )
})
TaskRow.displayName = 'TaskRow'
