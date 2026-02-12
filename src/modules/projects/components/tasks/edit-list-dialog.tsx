'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/modules/shared/ui/dialog'
import { Button } from '@/modules/shared/ui/button'
import { Input } from '@/modules/shared/ui/input'
import { Label } from '@/modules/shared/ui/label'
import { useTranslations } from 'next-intl'
import { updateTaskList } from '@/modules/projects/actions/task-lists'
import { toast } from 'sonner'

interface EditListDialogProps {
  isOpen: boolean
  onClose: () => void
  list: {
    id: string
    name: string
    color: string | null
  } | null
}

export function EditListDialog({ isOpen, onClose, list }: EditListDialogProps) {
  const t = useTranslations('tasks')
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6B7280') // Default gray
  const [isLoading, setIsLoading] = useState(false)

  // Reset form when list changes
  useEffect(() => {
    if (list) {
      setName(list.name)
      setColor(list.color || '#6B7280')
    }
  }, [list])

  const colors = [
    '#6B7280', // Gray
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !list) return

    setIsLoading(true)
    try {
      await updateTaskList(list.id, {
        name,
        color
      })
      toast.success(t('listUpdated'))
      onClose()
    } catch (error) {
      toast.error('Failed to update list')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('editList')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('listName')}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('listNamePlaceholder')}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-3">
            <Label>{t('color')}</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading} className="cursor-pointer">
              {isLoading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
