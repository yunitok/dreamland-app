'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTagInput {
  name: string
  color?: string
  projectId: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

// =============================================================================
// TAGS
// =============================================================================

export async function getTags(projectId: string) {
  return prisma.tag.findMany({
    where: { projectId },
    include: {
      _count: { select: { tasks: true } }
    },
    orderBy: { name: 'asc' }
  })
}

export async function createTag(data: CreateTagInput) {
  // Check for duplicate name in project
  const existing = await prisma.tag.findUnique({
    where: {
      projectId_name: {
        projectId: data.projectId,
        name: data.name
      }
    }
  })
  
  if (existing) {
    throw new Error('A tag with this name already exists in this project')
  }

  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      color: data.color || '#3B82F6',
      projectId: data.projectId,
    }
  })

  revalidatePath(`/projects/${data.projectId}`)
  return tag
}

export async function updateTag(id: string, data: UpdateTagInput) {
  const tag = await prisma.tag.findUnique({
    where: { id },
    select: { projectId: true }
  })
  
  if (!tag) throw new Error('Tag not found')

  // Check for duplicate name if updating name
  if (data.name) {
    const existing = await prisma.tag.findFirst({
      where: {
        projectId: tag.projectId,
        name: data.name,
        NOT: { id }
      }
    })
    
    if (existing) {
      throw new Error('A tag with this name already exists in this project')
    }
  }

  const updated = await prisma.tag.update({
    where: { id },
    data: {
      name: data.name,
      color: data.color,
    }
  })

  revalidatePath(`/projects/${tag.projectId}`)
  return updated
}

export async function deleteTag(id: string) {
  const tag = await prisma.tag.findUnique({
    where: { id },
    select: { projectId: true }
  })
  
  if (!tag) throw new Error('Tag not found')

  await prisma.tag.delete({ where: { id } })

  revalidatePath(`/projects/${tag.projectId}`)
  return { success: true }
}

// =============================================================================
// TAG ASSIGNMENT
// =============================================================================

export async function addTagToTask(taskId: string, tagId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      tags: { connect: { id: tagId } }
    },
    include: { 
      tags: true,
      list: { select: { projectId: true } }
    }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return task
}

export async function removeTagFromTask(taskId: string, tagId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      tags: { disconnect: { id: tagId } }
    },
    include: { 
      tags: true,
      list: { select: { projectId: true } }
    }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return task
}
