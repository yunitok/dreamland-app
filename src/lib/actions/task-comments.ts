'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// =============================================================================
// TASK COMMENTS
// =============================================================================

export async function getComments(taskId: string) {
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
    orderBy: { createdAt: 'asc' } // Oldest first for thread view
  })
}

export async function createComment(taskId: string, content: string, authorId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { select: { projectId: true } } }
  })
  
  if (!task) throw new Error('Task not found')

  const comment = await prisma.taskComment.create({
    data: {
      content,
      taskId,
      authorId,
    },
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
  if (comment.authorId !== userId) throw new Error('Not authorized to delete this comment')

  await prisma.taskComment.delete({ where: { id } })

  revalidatePath(`/projects/${comment.task.list.projectId}`)
  return { success: true }
}
