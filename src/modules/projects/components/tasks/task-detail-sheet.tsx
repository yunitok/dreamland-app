/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/modules/shared/ui/sheet'
import { Badge } from '@/modules/shared/ui/badge'
import { Button } from '@/modules/shared/ui/button'
import { Input } from '@/modules/shared/ui/input'
import { Textarea } from '@/modules/shared/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import { Progress } from '@/modules/shared/ui/progress'
import { Separator } from '@/modules/shared/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shared/ui/select'
import {
  Calendar,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  Clock,
  Link2,
  Trash2,
  Send,
  X,
  Plus,
  Pencil,
  FolderKanban
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getTask, updateTask, updateTaskProgress, addDependency, removeDependency } from '@/modules/projects/actions/tasks'
import { createComment, deleteComment } from '@/modules/projects/actions/task-comments'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/modules/shared/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/shared/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"

interface TaskDetailSheetProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  statuses: Array<{ id: string; name: string; color: string; isClosed: boolean }>
  tags: Array<{ id: string; name: string; color: string }>
  users: Array<{ id: string; name: string | null; image: string | null; username: string }>
  currentUserId: string
  allTasks?: Array<{ id: string; title: string }>
  lists: Array<{ id: string; name: string }>
}

export function TaskDetailSheet({
  taskId,
  isOpen,
  onClose,
  statuses,
  tags,
  users,
  currentUserId,
  allTasks = [],
  lists = []
}: TaskDetailSheetProps) {
  const t = useTranslations('tasks')
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [isAddingDependency, setIsAddingDependency] = useState(false)
  const [localProgress, setLocalProgress] = useState<number>(0)
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assigneeListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (taskId && isOpen) {
      loadTask()
    }
  }, [taskId, isOpen])

  const loadTask = async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const data = await getTask(taskId)
      setTask(data)
      setEditedTitle(data?.title || '')
      setEditedDescription(data?.description || '')
      setLocalProgress(data?.progress ?? 0)
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (statusId: string) => {
    if (!task) return

    // Client-side validation: check if task has assignee before moving out of Backlog
    const targetStatus = statuses.find(s => s.id === statusId)
    const isMovingToNonBacklog = targetStatus && targetStatus.name !== 'Backlog'
    if (!task.assignee && isMovingToNonBacklog) {
      toast.warning(t('assigneeRequiredToMove'), {
        description: t('assignTaskFirstDescription'),
        duration: 5000
      })
      return
    }

    try {
      await updateTask(task.id, { statusId })
      setTask({ ...task, status: targetStatus })
      toast.success(t('taskMoved'))
    } catch (error) {
      console.error('Failed to update status:', error)
      const errorMessage = error instanceof Error ? error.message : t('failedToMoveTask')
      toast.error(t('errorMovingTask'), {
        description: errorMessage,
        duration: 5000
      })
    }
  }

  const handleListChange = async (listId: string) => {
    if (!task) return
    try {
      await updateTask(task.id, { listId })
      const newList = lists.find(l => l.id === listId)
      setTask({ ...task, list: newList })
    } catch (error) {
      console.error('Failed to update list:', error)
    }
  }

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!task) return

    const newAssigneeId = assigneeId === 'unassigned' ? null : assigneeId

    // Client-side validation: cannot remove assignee from tasks outside Backlog
    if (newAssigneeId === null && task.status?.name !== 'Backlog') {
      toast.warning(t('cannotRemoveAssignee'), {
        description: t('moveToBacklogFirstDescription'),
        duration: 5000
      })
      return
    }

    try {
      await updateTask(task.id, { assigneeId: newAssigneeId })
      const assignee = users.find(u => u.id === newAssigneeId)
      setTask({ ...task, assignee })
    } catch (error) {
      console.error('Failed to update assignee:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update assignee'
      toast.error(errorMessage, { duration: 5000 })
    }
  }

  const handleProgressChange = (progress: number) => {
    if (!task) return
    const clamped = Math.max(0, Math.min(100, progress))
    setLocalProgress(clamped)
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
    progressTimerRef.current = setTimeout(async () => {
      try {
        await updateTaskProgress(task.id, clamped)
        setTask((prev: any) => prev ? { ...prev, progress: clamped } : prev)
      } catch (error) {
        console.error('Failed to update progress:', error)
      }
    }, 600)
  }

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
    }
  }, [])

  const handleSaveEdit = async () => {
    if (!task) return
    try {
      const technicalNotes = task.technicalNotes
      await updateTask(task.id, {
        title: editedTitle,
        description: editedDescription,
        technicalNotes
      })
      setTask({ ...task, title: editedTitle, description: editedDescription, technicalNotes })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return
    setSubmittingComment(true)
    try {
      const comment = await createComment(task.id, newComment, currentUserId)
      setTask({
        ...task,
        comments: [comment, ...task.comments]
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleAddDependency = async (predecessorId: string) => {
    if (!task) return
    try {
      await addDependency(predecessorId, task.id)
      loadTask()
      setIsAddingDependency(false)
    } catch (error) {
      console.error('Failed to add dependency:', error)
    }
  }

  const handleRemoveDependency = async (predecessorId: string) => {
    if (!task) return
    try {
      await removeDependency(predecessorId, task.id)
      loadTask()
    } catch (error) {
      console.error('Failed to remove dependency:', error)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const toDateInputValue = (date: Date | null) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleStartDateChange = async (value: string) => {
    if (!task) return
    const newDate = value ? new Date(value + 'T00:00:00') : null
    setTask({ ...task, startDate: newDate })
    try {
      await updateTask(task.id, { startDate: newDate })
    } catch (error) {
      console.error('Failed to update start date:', error)
    }
  }

  const handleDueDateChange = async (value: string) => {
    if (!task) return
    const newDate = value ? new Date(value + 'T00:00:00') : null
    setTask({ ...task, dueDate: newDate })
    try {
      await updateTask(task.id, { dueDate: newDate })
    } catch (error) {
      console.error('Failed to update due date:', error)
    }
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!task && !loading) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <SheetTitle className="sr-only">{t('task')}</SheetTitle>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : task ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 py-6 border-b">
              {isEditing ? (
                <div className="space-y-4 pr-8">
                  <div className="space-y-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-lg font-semibold"
                      placeholder={t('taskTitlePlaceholder')}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-4">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                      rows={6}
                      className="resize-none font-sans"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {t('technicalNotes')}
                    </label>
                    <Textarea
                      value={task.technicalNotes || ''}
                      onChange={(e) => setTask({ ...task, technicalNotes: e.target.value })}
                      placeholder={t('technicalNotesPlaceholder') || 'Technical implementation details...'}
                      rows={4}
                      className="resize-none font-mono text-xs bg-muted/20 focus-visible:ring-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setIsEditing(false)
                      setEditedTitle(task.title)
                      setEditedDescription(task.description || '')
                    }}>
                      {t('cancel')}
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      {t('save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-6 mr-8">
                  <div
                    className="group cursor-pointer -ml-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    onClick={() => setIsEditing(true)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <SheetTitle className="text-xl font-bold break-words leading-tight text-left">
                          {task.title}
                        </SheetTitle>
                        {/* Story Points Badge */}
                        {task.storyPoints !== null && task.storyPoints !== undefined && (
                          <Badge variant="secondary" className="mt-2 text-xs font-normal">
                            {task.storyPoints} {t('storyPoints')}
                          </Badge>
                        )}
                      </div>
                      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                    </div>

                    <div className="mt-4 text-left">
                      {task.description ? (
                        <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm prose-stone dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.description}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 italic flex items-center gap-1.5">
                          <Plus className="h-3 w-3" />
                          {t('clickToAddDescription')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Technical Notes - Always Visible */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span>
                      {t('technicalNotes')}
                    </h4>
                    <div
                      className={cn(
                        "p-3 rounded-md border border-muted/50 transition-colors cursor-text min-h-[80px]",
                        task.technicalNotes ? "bg-muted/30 text-sm" : "bg-transparent hover:bg-muted/30"
                      )}
                      onClick={() => setIsEditing(true)}
                    >
                      {task.technicalNotes ? (
                        <div className="text-sm text-foreground leading-relaxed prose prose-sm prose-stone dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.technicalNotes}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-muted-foreground/40 italic text-sm">{t('technicalNotesPlaceholder') || 'Add technical notes...'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </SheetHeader>

            {/* Properties Grid */}
            <div className="p-6 border-b">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {/* List */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {t('list')}
                  </span>
                  <Select value={task.list?.id} onValueChange={handleListChange}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.map(list => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {t('status')}
                  </span>
                  <Select value={task.status.id} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full h-9">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: task.status.color }}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {t(`statuses.${status.name}`)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Story Points */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {t('storyPoints')}
                  </span>
                  <Select
                    value={task.storyPoints?.toString() || '0'}
                    onValueChange={(value) => {
                      const points = value === '0' ? null : Number(value)
                      setTask({ ...task, storyPoints: points })
                      updateTask(task.id, { storyPoints: points })
                    }}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">-</SelectItem>
                      {[1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map((point) => (
                        <SelectItem key={point} value={point.toString()}>
                          {point}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {t('assignee')}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-9 font-normal"
                      >
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={task.assignee.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{task.assignee.name || task.assignee.username}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t('unassigned')}</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('searchUsers')} onValueChange={() => {
                          requestAnimationFrame(() => assigneeListRef.current?.scrollTo(0, 0))
                        }} />
                        <CommandList ref={assigneeListRef}>
                          <CommandEmpty>{t('noUsersFound')}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="unassigned"
                              onSelect={() => handleAssigneeChange("unassigned")}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !task.assignee ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {t('unassigned')}
                            </CommandItem>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={user.name || user.username}
                                onSelect={() => handleAssigneeChange(user.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    task.assignee?.id === user.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.name || user.username}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Start Date */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t('startDate')}
                  </span>
                  <Input
                    type="date"
                    className="h-9"
                    value={toDateInputValue(task.startDate)}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t('dueDate')}
                  </span>
                  <Input
                    type="date"
                    className={cn(
                      "h-9",
                      task.dueDate && new Date(task.dueDate) < new Date() && !task.status.isClosed
                        && "text-red-500 font-medium"
                    )}
                    value={toDateInputValue(task.dueDate)}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Progress, Tags, Dependencies Section */}
            <div className="p-6 border-b space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  {t('progress')}
                </span>
                <div className="flex items-center gap-3 flex-1">
                  <Progress value={localProgress} className="flex-1 h-2" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={localProgress}
                    onChange={(e) => handleProgressChange(Number(e.target.value))}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="text-sm text-muted-foreground w-24 shrink-0 pt-1">
                    <Tag className="h-4 w-4 inline mr-1" />
                    {t('tags')}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag: any) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          borderColor: tag.color,
                          color: tag.color
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              <div className="flex items-start gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0 pt-1">
                  <Link2 className="h-4 w-4 inline mr-1" />
                  {t('dependencies')}
                </span>
                <div className="flex-1 space-y-2">
                  {/* Existing Dependencies */}
                  {task.predecessors?.map((dep: any) => (
                    <div key={dep.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('blockedBy')}</span>
                        <span className="truncate max-w-[150px]">{dep.predecessor.title}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4"
                          style={{
                            backgroundColor: `${dep.predecessor.status.color}20`,
                            color: dep.predecessor.status.color
                          }}
                        >
                          {t(`statuses.${dep.predecessor.status.name}`)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveDependency(dep.predecessor.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Add Dependency Control */}
                  {isAddingDependency ? (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={handleAddDependency}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allTasks
                            .filter(t => t.id !== task.id && !task.predecessors?.find((p: any) => p.predecessor.id === t.id))
                            .map(t => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">
                                {t.title}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsAddingDependency(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsAddingDependency(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('addDependency')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="p-6 border-b">
                <h4 className="text-sm font-medium mb-3">
                  {t('subtasks')} ({task.subtasks.length})
                </h4>
                <div className="space-y-2">
                  {task.subtasks.map((subtask: any) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: subtask.status.color }}
                      />
                      <span className={cn(
                        "text-sm flex-1",
                        subtask.status.isClosed && "line-through text-muted-foreground"
                      )}>
                        {subtask.title}
                      </span>
                      {subtask.assignee && (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={subtask.assignee.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {subtask.assignee.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="flex-1 p-6">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('comments')} ({task.comments?.length || 0})
              </h4>

              {/* Add Comment */}
              <div className="flex gap-2 mb-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('writeComment')}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  disabled={!newComment.trim() || submittingComment}
                  onClick={handleAddComment}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {task.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.author.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.author.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
