'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTaskStatusInput {
  name: string
  color?: string
  projectId: string
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

export async function getTaskStatuses(projectId: string) {
  return prisma.taskStatus.findMany({
    where: { projectId },
    include: {
      _count: { select: { tasks: true } }
    },
    orderBy: { position: 'asc' }
  })
}

export async function createTaskStatus(data: CreateTaskStatusInput) {
  // Check for duplicate name in project
  const existing = await prisma.taskStatus.findUnique({
    where: {
      projectId_name: {
        projectId: data.projectId,
        name: data.name
      }
    }
  })
  
  if (existing) {
    throw new Error('A status with this name already exists in this project')
  }

  // Get max position
  const maxPosition = await prisma.taskStatus.aggregate({
    where: { projectId: data.projectId },
    _max: { position: true }
  })
  
  const newPosition = (maxPosition._max.position ?? -1) + 1

  const status = await prisma.taskStatus.create({
    data: {
      name: data.name,
      color: data.color || '#6B7280',
      position: newPosition,
      isClosed: data.isClosed || false,
      projectId: data.projectId,
    }
  })

  revalidatePath(`/projects/${data.projectId}`)
  return status
}

export async function updateTaskStatus(id: string, data: UpdateTaskStatusInput) {
  const status = await prisma.taskStatus.findUnique({
    where: { id },
    select: { projectId: true }
  })
  
  if (!status) throw new Error('Status not found')

  // If setting as default, unset other defaults first
  if (data.isDefault) {
    await prisma.taskStatus.updateMany({
      where: { projectId: status.projectId, isDefault: true },
      data: { isDefault: false }
    })
  }

  const updated = await prisma.taskStatus.update({
    where: { id },
    data: {
      name: data.name,
      color: data.color,
      position: data.position,
      isClosed: data.isClosed,
      isDefault: data.isDefault,
    }
  })

  revalidatePath(`/projects/${status.projectId}`)
  return updated
}

export async function deleteTaskStatus(id: string) {
  const status = await prisma.taskStatus.findUnique({
    where: { id },
    select: { 
      projectId: true, 
      isDefault: true,
      _count: { select: { tasks: true } } 
    }
  })
  
  if (!status) throw new Error('Status not found')
  
  if (status.isDefault) {
    throw new Error('Cannot delete the default status. Set another status as default first.')
  }
  
  if (status._count.tasks > 0) {
    throw new Error('Cannot delete a status with tasks. Move tasks to another status first.')
  }

  await prisma.taskStatus.delete({ where: { id } })

  revalidatePath(`/projects/${status.projectId}`)
  return { success: true }
}

export async function reorderTaskStatuses(projectId: string, statusIds: string[]) {
  const updates = statusIds.map((id, index) => 
    prisma.taskStatus.update({
      where: { id },
      data: { position: index }
    })
  )
  
  await prisma.$transaction(updates)
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// =============================================================================
// DEFAULT STATUSES FOR NEW PROJECTS
// =============================================================================

export async function createDefaultStatuses(projectId: string) {
  const defaultStatuses = [
    { name: 'Backlog', color: '#94A3B8', position: 0, isDefault: true, isClosed: false }, // slate-400
    { name: 'To Do', color: '#6B7280', position: 1, isDefault: false, isClosed: false }, // gray-500
    { name: 'In Progress', color: '#3B82F6', position: 2, isDefault: false, isClosed: false }, // blue-500
    { name: 'Blocked', color: '#EF4444', position: 3, isDefault: false, isClosed: false }, // red-500
    { name: 'On Hold', color: '#F59E0B', position: 4, isDefault: false, isClosed: false }, // amber-500
    { name: 'Review', color: '#8B5CF6', position: 5, isDefault: false, isClosed: false }, // violet-500
    { name: 'Done', color: '#10B981', position: 6, isDefault: false, isClosed: true }, // green-500
  ]

  await prisma.taskStatus.createMany({
    data: defaultStatuses.map(s => ({ ...s, projectId }))
  })

  return prisma.taskStatus.findMany({
    where: { projectId },
    orderBy: { position: 'asc' }
  })
}
