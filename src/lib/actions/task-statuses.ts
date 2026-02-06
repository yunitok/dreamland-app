'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTaskStatusInput {
  name: string
  color?: string
  isClosed?: boolean
}

export interface UpdateTaskStatusInput {
  name?: string
  color?: string
  position?: number
  isClosed?: boolean
  isDefault?: boolean
}

// =============================================================================
// TASK STATUSES
// =============================================================================

export async function getTaskStatuses() {
  // projectId arg removed
  return prisma.taskStatus.findMany({
    include: {
      _count: { select: { tasks: true } }
    },
    orderBy: { position: 'asc' }
  })
}

// ... (lines in between)

export async function reorderTaskStatuses(_projectId: string, statusIds: string[]) {
  // _projectId arg kept for compatibility
  const updates = statusIds.map((id, index) => 
    prisma.taskStatus.update({
      where: { id },
      data: { position: index }
    })
  )
  
  await prisma.$transaction(updates)
  
  revalidatePath('/projects')
  return { success: true }
}

// =============================================================================
// DEFAULT STATUSES FOR NEW PROJECTS
// =============================================================================

export async function createDefaultStatuses() {
  // Since statuses are global, we don't create anything per project anymore.
  // We just return the existing global statuses to comply with any caller expectation of receiving statuses.
  return prisma.taskStatus.findMany({
    orderBy: { position: 'asc' }
  })
}
