'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

// =============================================================================
// CONSTANTS
// =============================================================================

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'attachments')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// =============================================================================
// TASK ATTACHMENTS
// =============================================================================

export async function getAttachments(taskId: string) {
  return prisma.taskAttachment.findMany({
    where: { taskId },
    include: {
      uploader: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function uploadAttachment(
  taskId: string, 
  uploaderId: string,
  file: {
    name: string
    type: string
    size: number
    data: ArrayBuffer
  }
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { select: { projectId: true } } }
  })
  
  if (!task) throw new Error('Task not found')
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit')
  }

  await ensureUploadDir()

  // Generate unique filename
  const ext = path.extname(file.name)
  const uniqueName = `${taskId}-${Date.now()}${ext}`
  const filepath = path.join(UPLOAD_DIR, uniqueName)
  const publicPath = `/uploads/attachments/${uniqueName}`

  // Write file to disk
  await fs.writeFile(filepath, Buffer.from(file.data))

  // Create database record
  const attachment = await prisma.taskAttachment.create({
    data: {
      filename: file.name,
      filepath: publicPath,
      filesize: file.size,
      mimetype: file.type,
      taskId,
      uploaderId,
    },
    include: {
      uploader: { select: { id: true, name: true } }
    }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return attachment
}

export async function deleteAttachment(id: string, userId: string) {
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id },
    include: { 
      task: { 
        include: { list: { select: { projectId: true } } } 
      } 
    }
  })
  
  if (!attachment) throw new Error('Attachment not found')
  
  // Only uploader or admin can delete
  // For now, we just check if user is the uploader
  if (attachment.uploaderId !== userId) {
    throw new Error('Not authorized to delete this attachment')
  }

  // Delete file from disk
  try {
    const fullPath = path.join(process.cwd(), 'public', attachment.filepath)
    await fs.unlink(fullPath)
  } catch (error) {
    console.error('Failed to delete file:', error)
    // Continue with database deletion even if file deletion fails
  }

  await prisma.taskAttachment.delete({ where: { id } })

  revalidatePath(`/projects/${attachment.task.list.projectId}`)
  return { success: true }
}
