'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/modules/shared/ui/dialog'
import { Button } from '@/modules/shared/ui/button'
import { useTranslations } from 'next-intl'
import { deleteTaskList } from '@/modules/projects/actions/task-lists'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

interface DeleteListDialogProps {
  isOpen: boolean
  onClose: () => void
  list: {
    id: string
    name: string
    taskCount: number
  } | null
}

export function DeleteListDialog({ isOpen, onClose, list }: DeleteListDialogProps) {
  const t = useTranslations('tasks')
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!list) return

    setIsLoading(true)
    try {
      await deleteTaskList(list.id)
      toast.success(t('listDeleted'))
      onClose()
    } catch (error) {
      // Error is usually "Cannot delete a list with tasks"
      toast.error(t('deleteListError')) 
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!list) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>{t('deleteList')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('deleteListConfirmation', { name: list.name })}
          </DialogDescription>
        </DialogHeader>

        {list.taskCount > 0 && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {t('deleteListWarningHasTasks', { count: list.taskCount })}
          </div>
        )}

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
            {t('cancel')}
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isLoading || list.taskCount > 0}
            className="cursor-pointer text-white"
          >
            {isLoading ? t('deleting') : t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
