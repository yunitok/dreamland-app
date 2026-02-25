'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hasProjectAccess } from '@/lib/actions/rbac'
import { uploadToStorage, deleteFromStorage, getSignedUrl } from '@/lib/supabase-storage'
import path from 'path'

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// =============================================================================
// TASK ATTACHMENTS
// =============================================================================

export async function getAttachments(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { list: { select: { projectId: true } } }
  })
  if (!task) return []
  if (!await hasProjectAccess(task.list.projectId, 'VIEWER')) throw new Error('Forbidden')

  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    include: {
      uploader: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Generar URLs firmadas para el bucket privado (1 hora de validez)
  // Compatibilidad con registros legacy del filesystem (rutas /uploads/...)
  const attachmentsWithUrls = await Promise.all(
    attachments.map(async (att) => {
      if (att.filepath.startsWith('/uploads/')) return att
      try {
        const signedUrl = await getSignedUrl('attachments', att.filepath, 3600)
        return { ...att, filepath: signedUrl }
      } catch {
        return att
      }
    })
  )

  return attachmentsWithUrls
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
  if (!await hasProjectAccess(task.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit')
  }

  const ext = path.extname(file.name)
  const storagePath = `tasks/${taskId}/${Date.now()}${ext}`

  // Subir a Supabase Storage (bucket privado 'attachments')
  await uploadToStorage('attachments', storagePath, Buffer.from(file.data), file.type)

  const attachment = await prisma.taskAttachment.create({
    data: {
      filename: file.name,
      filepath: storagePath, // Guardamos la ruta del bucket, no la URL
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
  if (!await hasProjectAccess(attachment.task.list.projectId, 'EDITOR')) throw new Error('Forbidden')
  if (attachment.uploaderId !== userId) throw new Error('Not authorized to delete this attachment')

  // Eliminar de Supabase Storage (ignorar errores de registros legacy del filesystem)
  if (!attachment.filepath.startsWith('/uploads/')) {
    try {
      await deleteFromStorage('attachments', attachment.filepath)
    } catch (err) {
      console.error('Storage delete warning:', err)
    }
  }

  await prisma.taskAttachment.delete({ where: { id } })

  revalidatePath(`/projects/${attachment.task.list.projectId}`)
  return { success: true }
}
