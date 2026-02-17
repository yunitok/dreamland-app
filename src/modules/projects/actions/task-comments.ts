'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hasProjectAccess } from '@/lib/actions/rbac'

// =============================================================================
// TASK COMMENTS
// =============================================================================

export async function getComments(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { list: { select: { projectId: true } } }
  })
  if (!task) return []
  if (!await hasProjectAccess(task.list.projectId, 'VIEWER')) throw new Error('Forbidden')

  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
}

export async function createComment(taskId: string, content: string, authorId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { select: { projectId: true } } }
  })

  if (!task) throw new Error('Task not found')
  if (!await hasProjectAccess(task.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const comment = await prisma.taskComment.create({
    data: { content, taskId, authorId },
    include: {
      author: { select: { id: true, name: true, image: true } }
    }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return comment
}

export async function updateComment(id: string, content: string, userId: string) {
  const comment = await prisma.taskComment.findUnique({
    where: { id },
    include: {
      task: {
        include: { list: { select: { projectId: true } } }
      }
    }
  })

  if (!comment) throw new Error('Comment not found')
  if (!await hasProjectAccess(comment.task.list.projectId, 'EDITOR')) throw new Error('Forbidden')
  if (comment.authorId !== userId) throw new Error('Not authorized to edit this comment')

  const updated = await prisma.taskComment.update({
    where: { id },
    data: { content },
    include: {
      author: { select: { id: true, name: true, image: true } }
    }
  })

  revalidatePath(`/projects/${comment.task.list.projectId}`)
  return updated
}

export async function deleteComment(id: string, userId: string) {
  const comment = await prisma.taskComment.findUnique({
    where: { id },
    include: {
      task: {
        include: { list: { select: { projectId: true } } }
      }
    }
  })

  if (!comment) throw new Error('Comment not found')
  if (!await hasProjectAccess(comment.task.list.projectId, 'EDITOR')) throw new Error('Forbidden')
  if (comment.authorId !== userId) throw new Error('Not authorized to delete this comment')

  await prisma.taskComment.delete({ where: { id } })

  revalidatePath(`/projects/${comment.task.list.projectId}`)
  return { success: true }
}
