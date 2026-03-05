"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { getSession } from "@/lib/auth"
import { emailNoteSchema, emailReplySchema } from "@/modules/atc/domain/schemas"
import { sendGmailMessage } from "@/modules/atc/domain/gmail-service"
import { uploadToStorage, getSignedUrl, deleteFromStorage } from "@/lib/supabase-storage"

// ─── Thread View ──────────────────────────────────────────────

export async function getEmailThread(emailInboxId: string) {
  await requirePermission("atc", "read")

  try {
    const email = await prisma.emailInbox.findUnique({
      where: { id: emailInboxId },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true, slug: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!email) return { success: false, error: "Email no encontrado" }

    // Fetch all emails in the same thread
    const threadEmails = email.threadId
      ? await prisma.emailInbox.findMany({
          where: { threadId: email.threadId },
          include: {
            category: { select: { id: true, name: true, color: true, icon: true, slug: true } },
            attachments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { receivedAt: "asc" },
        })
      : [email]

    // Fetch all replies for this thread
    const emailIds = threadEmails.map((e) => e.id)
    const replies = await prisma.emailReply.findMany({
      where: { emailInboxId: { in: emailIds } },
      include: {
        sentByUser: { select: { id: true, name: true, image: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    })

    // Fetch all notes for this thread
    const notes = await prisma.emailNote.findMany({
      where: { emailInboxId: { in: emailIds } },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    return {
      success: true,
      data: { emails: threadEmails, replies, notes },
    }
  } catch {
    return { success: false, error: "Error al cargar el hilo" }
  }
}

// ─── Notes ──────────────────────────────────────────────────

export async function addEmailNote(data: { emailInboxId: string; content: string }) {
  await requirePermission("atc", "manage")
  const session = await getSession()
  if (!session) return { success: false, error: "No autorizado" }

  const parsed = emailNoteSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  try {
    const note = await prisma.emailNote.create({
      data: {
        emailInboxId: parsed.data.emailInboxId,
        content: parsed.data.content,
        createdBy: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    })

    revalidatePath("/atc/backoffice")
    return { success: true, data: note }
  } catch {
    return { success: false, error: "Error al crear la nota" }
  }
}

export async function deleteEmailNote(noteId: string) {
  await requirePermission("atc", "manage")
  const session = await getSession()
  if (!session) return { success: false, error: "No autorizado" }

  try {
    const note = await prisma.emailNote.findUnique({ where: { id: noteId } })
    if (!note) return { success: false, error: "Nota no encontrada" }
    if (note.createdBy !== session.user.id) {
      return { success: false, error: "Solo puedes eliminar tus propias notas" }
    }

    await prisma.emailNote.delete({ where: { id: noteId } })
    revalidatePath("/atc/backoffice")
    return { success: true }
  } catch {
    return { success: false, error: "Error al eliminar la nota" }
  }
}

// ─── Send Email Reply ──────────────────────────────────────────

export async function sendEmailReply(data: {
  emailInboxId: string
  replyType: string
  toEmails: string[]
  ccEmails?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  attachmentIds?: string[]
}) {
  await requirePermission("atc", "manage")
  const session = await getSession()
  if (!session) return { success: false, error: "No autorizado" }

  const parsed = emailReplySchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  try {
    // Get the original email for threading
    const originalEmail = await prisma.emailInbox.findUnique({
      where: { id: parsed.data.emailInboxId },
    })
    if (!originalEmail) return { success: false, error: "Email original no encontrado" }

    // Get attachment files from Supabase if any
    const attachmentFiles: Array<{ filename: string; mimeType: string; content: Buffer }> = []
    if (parsed.data.attachmentIds.length > 0) {
      const attachments = await prisma.emailAttachment.findMany({
        where: { id: { in: parsed.data.attachmentIds } },
      })
      for (const att of attachments) {
        const url = await getSignedUrl("attachments", att.storagePath)
        const response = await fetch(url)
        const buffer = Buffer.from(await response.arrayBuffer())
        attachmentFiles.push({ filename: att.fileName, mimeType: att.mimeType, content: buffer })
      }
    }

    // Send via Gmail API
    let gmailMessageId: string | null = null
    let gmailThreadId: string | null = null
    let errorMessage: string | null = null

    try {
      const result = await sendGmailMessage({
        to: parsed.data.toEmails,
        cc: parsed.data.ccEmails,
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        threadId: originalEmail.threadId,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.messageId,
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
      })
      gmailMessageId = result.messageId
      gmailThreadId = result.threadId
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Error desconocido al enviar"
    }

    // Persist the reply
    const reply = await prisma.emailReply.create({
      data: {
        emailInboxId: parsed.data.emailInboxId,
        threadId: gmailThreadId ?? originalEmail.threadId,
        gmailMessageId,
        replyType: parsed.data.replyType as "REPLY" | "REPLY_ALL" | "FORWARD",
        toEmails: parsed.data.toEmails,
        ccEmails: parsed.data.ccEmails,
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        bodyText: parsed.data.bodyText,
        sentAt: errorMessage ? null : new Date(),
        sentBy: session.user.id,
        errorMessage,
      },
    })

    // Link attachments to the reply
    if (parsed.data.attachmentIds.length > 0) {
      await prisma.emailAttachment.updateMany({
        where: { id: { in: parsed.data.attachmentIds } },
        data: { emailReplyId: reply.id },
      })
    }

    // Mark original as read + no action required
    await prisma.emailInbox.update({
      where: { id: parsed.data.emailInboxId },
      data: { isRead: true, actionRequired: false },
    })

    revalidatePath("/atc/backoffice")

    if (errorMessage) {
      return { success: false, error: `Email guardado pero no enviado: ${errorMessage}` }
    }

    return { success: true, data: reply }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al enviar el email"
    return { success: false, error: msg }
  }
}

// ─── Attachments ──────────────────────────────────────────────

export async function uploadEmailAttachment(formData: FormData) {
  await requirePermission("atc", "manage")

  const file = formData.get("file") as File | null
  if (!file) return { success: false, error: "No se proporcionó archivo" }
  if (file.size > 10 * 1048576) return { success: false, error: "El archivo supera los 10MB" }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `email/${Date.now()}_${file.name}`
    await uploadToStorage("attachments", storagePath, buffer, file.type || "application/octet-stream")

    const attachment = await prisma.emailAttachment.create({
      data: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        storagePath,
      },
    })

    return { success: true, data: { id: attachment.id, fileName: attachment.fileName, storagePath } }
  } catch {
    return { success: false, error: "Error al subir el archivo" }
  }
}

export async function getAttachmentSignedUrl(attachmentId: string) {
  await requirePermission("atc", "read")

  try {
    const attachment = await prisma.emailAttachment.findUnique({ where: { id: attachmentId } })
    if (!attachment) return { success: false, error: "Adjunto no encontrado" }

    const url = await getSignedUrl("attachments", attachment.storagePath)
    return { success: true, data: { url } }
  } catch {
    return { success: false, error: "Error al generar URL de descarga" }
  }
}

export async function deleteEmailAttachment(attachmentId: string) {
  await requirePermission("atc", "manage")

  try {
    const attachment = await prisma.emailAttachment.findUnique({ where: { id: attachmentId } })
    if (!attachment) return { success: false, error: "Adjunto no encontrado" }

    await deleteFromStorage("attachments", attachment.storagePath)
    await prisma.emailAttachment.delete({ where: { id: attachmentId } })

    return { success: true }
  } catch {
    return { success: false, error: "Error al eliminar el adjunto" }
  }
}
