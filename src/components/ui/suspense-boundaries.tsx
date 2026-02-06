'use client'

import { Suspense, ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Page-level suspense boundary with full-page loading
 */
interface PageSuspenseProps {
  children: ReactNode
  fallback?: ReactNode
}

function PageFallback() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  )
}

export function PageSuspense({ children, fallback }: PageSuspenseProps) {
  return (
    <Suspense fallback={fallback || <PageFallback />}>
      {children}
    </Suspense>
  )
}

/**
 * Card-level suspense for smaller components
 */
function CardFallback() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function CardSuspense({ children, fallback }: PageSuspenseProps) {
  return (
    <Suspense fallback={fallback || <CardFallback />}>
      {children}
    </Suspense>
  )
}

/**
 * Table/List suspense boundary
 */
function TableFallback({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function TableSuspense({ 
  children, 
  rows = 5 
}: { 
  children: ReactNode
  rows?: number 
}) {
  return (
    <Suspense fallback={<TableFallback rows={rows} />}>
      {children}
    </Suspense>
  )
}

/**
 * Modal/Dialog content suspense
 */
function ModalFallback() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

export function ModalSuspense({ children, fallback }: PageSuspenseProps) {
  return (
    <Suspense fallback={fallback || <ModalFallback />}>
      {children}
    </Suspense>
  )
}
