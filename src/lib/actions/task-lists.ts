'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTaskListInput {
  name: string
  description?: string
  color?: string
  projectId: string
}

export interface UpdateTaskListInput {
  name?: string
  description?: string
  color?: string
  position?: number
}

// =============================================================================
// TASK LIST CRUD
// =============================================================================

export async function getTaskLists(projectId: string) {
  return prisma.taskList.findMany({
    where: { projectId },
    include: {
      tasks: {
        where: { parentId: null },
        include: {
          status: true,
          assignee: { select: { id: true, name: true, image: true } },
          tags: true,
          _count: { select: { subtasks: true, comments: true } }
        },
        orderBy: { position: 'asc' }
      },
      _count: { select: { tasks: true } }
    },
    orderBy: { position: 'asc' }
  })
}

export async function getTaskList(id: string) {
  return prisma.taskList.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, title: true } },
      tasks: {
        where: { parentId: null },
        include: {
          status: true,
          assignee: { select: { id: true, name: true, image: true } },
          tags: true,
          subtasks: {
            include: { status: true }
          }
        },
        orderBy: { position: 'asc' }
      }
    }
  })
}

export async function createTaskList(data: CreateTaskListInput) {
  // Get max position
  const maxPosition = await prisma.taskList.aggregate({
    where: { projectId: data.projectId },
    _max: { position: true }
  })
  
  const newPosition = (maxPosition._max.position ?? -1) + 1

  const list = await prisma.taskList.create({
    data: {
      name: data.name,
      description: data.description,
      color: data.color,
      position: newPosition,
      projectId: data.projectId,
    }
  })

  revalidatePath(`/projects/${data.projectId}`)
  return list
}

export async function updateTaskList(id: string, data: UpdateTaskListInput) {
  const list = await prisma.taskList.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      color: data.color,
      position: data.position,
    },
    include: { project: { select: { id: true } } }
  })

  revalidatePath(`/projects/${list.project.id}`)
  return list
}

export async function deleteTaskList(id: string) {
  const list = await prisma.taskList.findUnique({
    where: { id },
    select: { projectId: true, _count: { select: { tasks: true } } }
  })
  
  if (!list) throw new Error('Task list not found')
  
  if (list._count.tasks > 0) {
    throw new Error('Cannot delete a list with tasks. Move or delete tasks first.')
  }

  await prisma.taskList.delete({ where: { id } })
  
  revalidatePath(`/projects/${list.projectId}`)
  return { success: true }
}

export async function reorderTaskLists(projectId: string, listIds: string[]) {
  const updates = listIds.map((id, index) => 
    prisma.taskList.update({
      where: { id },
      data: { position: index }
    })
  )
  
  await prisma.$transaction(updates)
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
