import { Button } from '@/modules/shared/ui/button'
import { Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TimelineToolbarProps {
  viewMode: 'month' | 'quarter' | 'year'
  setViewMode: (mode: 'month' | 'quarter' | 'year') => void
  onTodayClick: () => void
  taskCount: number
}

export function TimelineToolbar({ 
  viewMode, 
  setViewMode, 
  onTodayClick, 
  taskCount 
}: TimelineToolbarProps) {
  const t = useTranslations('tasks')

  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Button variant="outline" size="sm" onClick={onTodayClick}>
        <Calendar className="h-4 w-4 mr-2" />
        {t('ganttToday')}
      </Button>

      <div className="flex items-center gap-1 rounded-lg border p-1">
        {(['month', 'quarter', 'year'] as const).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3"
            onClick={() => setViewMode(mode)}
          >
            {t(`timeline.${mode}`)}
          </Button>
        ))}
      </div>

      <span className="text-sm text-muted-foreground ml-auto">
        {taskCount} {t('tasks')}
      </span>
    </div>
  )
}
