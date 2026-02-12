'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/modules/shared/ui/dialog'
import { Button } from '@/modules/shared/ui/button'
import { Input } from '@/modules/shared/ui/input'
import { Textarea } from '@/modules/shared/ui/textarea'
import { Label } from '@/modules/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shared/ui/select'
import { Badge } from '@/modules/shared/ui/badge'
import { useTranslations } from 'next-intl'
import { createTask } from '@/modules/projects/actions/tasks'
import { useRouter } from 'next/navigation'

interface CreateTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  listId: string | null
  defaultStatusId: string | undefined
  statuses: Array<{ id: string; name: string; color: string }>
  tags: Array<{ id: string; name: string; color: string }>
  users: Array<{ id: string; name: string | null; image: string | null; username: string }>
}

export function CreateTaskDialog({
  isOpen,
  onClose,
  projectId,
  listId,
  defaultStatusId,
  statuses,
  tags,
  users,
}: CreateTaskDialogProps) {
  const t = useTranslations('tasks')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState(defaultStatusId || '')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [storyPoints, setStoryPoints] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !listId || !statusId) return

    setLoading(true)
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        listId,
        statusId,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        storyPoints: storyPoints ? parseInt(storyPoints) : undefined,
        tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      })
      
      // Reset form
      setTitle('')
      setDescription('')
      setAssigneeId('')
      setSelectedTags([])
      setDueDate('')
      setEstimatedHours('')
      setStoryPoints('')
      
      onClose()
      router.refresh()
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createTask')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('taskTitle')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('taskTitlePlaceholder')}
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus')} />
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
            <div className="space-y-2">
              <Label>{t('assignee')}</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('unassigned')}</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('dueDate')}</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Hours */}
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">{t('estimatedHours')}</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Story Points */}
            <div className="space-y-2">
              <Label>{t('storyPoints')}</Label>
              <Select value={storyPoints} onValueChange={setStoryPoints}>
                <SelectTrigger>
                  <SelectValue placeholder="Points" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 8, 13, 21].map((point) => (
                    <SelectItem key={point} value={point.toString()}>
                      {point} Points
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>{t('tags')}</Label>
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    style={selectedTags.includes(tag.id) ? {
                      backgroundColor: tag.color,
                      borderColor: tag.color,
                    } : {
                      borderColor: tag.color,
                      color: tag.color,
                    }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? t('creating') : t('createTask')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
