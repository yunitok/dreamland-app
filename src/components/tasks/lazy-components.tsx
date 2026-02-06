'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for Gantt chart
 */
function GanttSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Loading skeleton for Calendar view
 */
function CalendarSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

/**
 * Lazy-loaded Gantt Chart component
 * ~410 lines, loads only when needed
 */
export const LazyGanttChart = dynamic(
  () => import('./gantt-chart').then(mod => ({ default: mod.GanttChart })),
  {
    loading: () => <GanttSkeleton />,
    ssr: false, // Gantt uses DOM measurements
  }
)

/**
 * Lazy-loaded Calendar View component  
 * Uses FullCalendar which doesn't support SSR
 */
export const LazyCalendarView = dynamic(
  () => import('./calendar-view').then(mod => ({ default: mod.CalendarView })),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false, // FullCalendar doesn't support SSR
  }
)

/**
 * Lazy-loaded Timeline View
 */
export const LazyTimelineView = dynamic(
  () => import('./timeline-view').then(mod => ({ default: mod.TimelineView })),
  {
    loading: () => <GanttSkeleton />,
    ssr: false,
  }
)
