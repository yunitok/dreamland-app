'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { getTask, updateTask, updateTaskProgress, addDependency, removeDependency } from '@/lib/actions/tasks'
import { createComment, deleteComment } from '@/lib/actions/task-comments'

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
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (statusId: string) => {
    if (!task) return
    try {
      await updateTask(task.id, { statusId })
      setTask({ ...task, status: statuses.find(s => s.id === statusId) })
    } catch (error) {
      console.error('Failed to update status:', error)
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
    try {
      const newAssigneeId = assigneeId === 'unassigned' ? null : assigneeId
      await updateTask(task.id, { assigneeId: newAssigneeId })
      const assignee = users.find(u => u.id === newAssigneeId)
      setTask({ ...task, assignee })
    } catch (error) {
      console.error('Failed to update assignee:', error)
    }
  }

  const handleProgressChange = async (progress: number) => {
    if (!task) return
    try {
      await updateTaskProgress(task.id, progress)
      setTask({ ...task, progress })
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!task) return
    try {
      await updateTask(task.id, { 
        title: editedTitle, 
        description: editedDescription 
      })
      setTask({ ...task, title: editedTitle, description: editedDescription })
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
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                      rows={4}
                      className="resize-none"
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
                <div className="flex items-start justify-between mr-8">
                  <div 
                    className="flex-1 group cursor-pointer -ml-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    onClick={() => setIsEditing(true)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <SheetTitle className="text-xl font-bold break-words leading-tight text-left">
                        {task.title}
                      </SheetTitle>
                      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                    </div>
                    
                    <div className="mt-2 text-left">
                      {task.description ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {task.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 italic flex items-center gap-1.5">
                          <Plus className="h-3 w-3" />
                          {t('clickToAddDescription')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </SheetHeader>

            {/* Properties */}
            <div className="p-6 space-y-4 border-b">
              {/* List */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  <FolderKanban className="h-4 w-4 inline mr-1" />
                  List
                </span>
                <Select value={task.list?.id} onValueChange={handleListChange}>
                  <SelectTrigger className="w-[180px]">
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
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  {t('status')}
                </span>
                <Select value={task.status.id} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]">
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
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  <User className="h-4 w-4 inline mr-1" />
                  {t('assignee')}
                </span>
                <Select 
                  value={task.assignee?.id || 'unassigned'} 
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {user.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {user.name || user.username}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {t('dueDate')}
                </span>
                <span className={cn(
                  "text-sm",
                  task.dueDate && new Date(task.dueDate) < new Date() && !task.status.isClosed
                    ? "text-red-500 font-medium"
                    : ""
                )}>
                  {formatDate(task.dueDate)}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  {t('progress')}
                </span>
                <div className="flex items-center gap-3 flex-1">
                  <Progress value={task.progress} className="flex-1 h-2" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={task.progress}
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
                            {dep.predecessor.status.name}
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
