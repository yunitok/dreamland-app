import { Button } from '@/modules/shared/ui/button'
import { Calendar, ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GanttToolbarProps {
  zoom: number
  setZoom: (zoom: number) => void
  onTodayClick: () => void
}

export function GanttToolbar({ zoom, setZoom, onTodayClick }: GanttToolbarProps) {
  const t = useTranslations('tasks')

  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Button variant="outline" size="sm" onClick={onTodayClick}>
        <Calendar className="h-4 w-4 mr-2" />
        {t('ganttToday')}
      </Button>
      
      <div className="flex items-center gap-1 ml-auto">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => setZoom(Math.min(2, zoom + 0.25))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
