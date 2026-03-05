"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { getSession } from "@/lib/auth"
import { sendGmailMessage } from "@/modules/atc/domain/gmail-service"
import { getSignedUrl } from "@/lib/supabase-storage"

// ─── Generate Draft ─────────────────────────────────────────

export async function generateDraft(emailInboxId: string) {
  await requirePermission("atc", "manage")

  try {
    const { generateEmailDraft } = await import("@/modules/atc/domain/draft-generator")
    const result = await generateEmailDraft(emailInboxId)
    revalidatePath("/atc/backoffice")
    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al generar borrador"
    return { success: false, error: msg }
  }
}

// ─── Send Draft (as-is) ────────────────────────────────────

export async function sendDraft(draftId: string) {
  await requirePermission("atc", "manage")
  const session = await getSession()
  if (!session) return { success: false, error: "No autorizado" }

  try {
    const draft = await prisma.emailReply.findUnique({
      where: { id: draftId },
      include: {
        emailInbox: true,
        attachments: true,
      },
    })
    if (!draft) return { success: false, error: "Borrador no encontrado" }
    if (!draft.isDraft) return { success: false, error: "Este email ya fue enviado" }

    // Get attachment files if any
    const attachmentFiles: Array<{ filename: string; mimeType: string; content: Buffer }> = []
    for (const att of draft.attachments) {
      const url = await getSignedUrl("attachments", att.storagePath)
      const response = await fetch(url)
      const buffer = Buffer.from(await response.arrayBuffer())
      attachmentFiles.push({ filename: att.fileName, mimeType: att.mimeType, content: buffer })
    }

    // Send via Gmail
    let gmailMessageId: string | null = null
    let gmailThreadId: string | null = null
    let errorMessage: string | null = null

    try {
      const result = await sendGmailMessage({
        to: draft.toEmails,
        cc: draft.ccEmails,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        threadId: draft.emailInbox.threadId,
        inReplyTo: draft.emailInbox.messageId,
        references: draft.emailInbox.messageId,
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
      })
      gmailMessageId = result.messageId
      gmailThreadId = result.threadId
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Error desconocido al enviar"
    }

    // Update draft → sent
    await prisma.emailReply.update({
      where: { id: draftId },
      data: {
        isDraft: false,
        sentAt: errorMessage ? null : new Date(),
        sentBy: session.user.id,
        gmailMessageId,
        threadId: gmailThreadId ?? draft.emailInbox.threadId,
        errorMessage,
      },
    })

    // Mark inbox as read + no action required
    await prisma.emailInbox.update({
      where: { id: draft.emailInboxId },
      data: { isRead: true, actionRequired: false, hasDraft: false },
    })

    revalidatePath("/atc/backoffice")

    if (errorMessage) {
      return { success: false, error: `Borrador guardado pero no enviado: ${errorMessage}` }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al enviar borrador"
    return { success: false, error: msg }
  }
}

// ─── Edit & Send Draft ──────────────────────────────────────

export async function editAndSendDraft(draftId: string, data: {
  bodyHtml: string
  bodyText?: string
  toEmails?: string[]
  ccEmails?: string[]
  subject?: string
}) {
  await requirePermission("atc", "manage")
  const session = await getSession()
  if (!session) return { success: false, error: "No autorizado" }

  try {
    const draft = await prisma.emailReply.findUnique({
      where: { id: draftId },
      include: {
        emailInbox: true,
        attachments: true,
      },
    })
    if (!draft) return { success: false, error: "Borrador no encontrado" }
    if (!draft.isDraft) return { success: false, error: "Este email ya fue enviado" }

    const finalToEmails = data.toEmails ?? draft.toEmails
    const finalCcEmails = data.ccEmails ?? draft.ccEmails
    const finalSubject = data.subject ?? draft.subject

    // Get attachment files
    const attachmentFiles: Array<{ filename: string; mimeType: string; content: Buffer }> = []
    for (const att of draft.attachments) {
      const url = await getSignedUrl("attachments", att.storagePath)
      const response = await fetch(url)
      const buffer = Buffer.from(await response.arrayBuffer())
      attachmentFiles.push({ filename: att.fileName, mimeType: att.mimeType, content: buffer })
    }

    // Send via Gmail
    let gmailMessageId: string | null = null
    let gmailThreadId: string | null = null
    let errorMessage: string | null = null

    try {
      const result = await sendGmailMessage({
        to: finalToEmails,
        cc: finalCcEmails,
        subject: finalSubject,
        bodyHtml: data.bodyHtml,
        threadId: draft.emailInbox.threadId,
        inReplyTo: draft.emailInbox.messageId,
        references: draft.emailInbox.messageId,
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
      })
      gmailMessageId = result.messageId
      gmailThreadId = result.threadId
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Error desconocido al enviar"
    }

    // Update draft → sent with edited content
    await prisma.emailReply.update({
      where: { id: draftId },
      data: {
        isDraft: false,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        toEmails: finalToEmails,
        ccEmails: finalCcEmails,
        subject: finalSubject,
        sentAt: errorMessage ? null : new Date(),
        sentBy: session.user.id,
        gmailMessageId,
        threadId: gmailThreadId ?? draft.emailInbox.threadId,
        errorMessage,
      },
    })

    // Mark inbox
    await prisma.emailInbox.update({
      where: { id: draft.emailInboxId },
      data: { isRead: true, actionRequired: false, hasDraft: false },
    })

    revalidatePath("/atc/backoffice")

    if (errorMessage) {
      return { success: false, error: `Borrador guardado pero no enviado: ${errorMessage}` }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al enviar borrador editado"
    return { success: false, error: msg }
  }
}

// ─── Discard Draft ──────────────────────────────────────────

export async function discardDraft(draftId: string) {
  await requirePermission("atc", "manage")

  try {
    const draft = await prisma.emailReply.findUnique({
      where: { id: draftId },
      select: { id: true, isDraft: true, emailInboxId: true },
    })
    if (!draft) return { success: false, error: "Borrador no encontrado" }
    if (!draft.isDraft) return { success: false, error: "No es un borrador" }

    await prisma.emailReply.delete({ where: { id: draftId } })

    // Check if there are other drafts for this email
    const otherDrafts = await prisma.emailReply.count({
      where: { emailInboxId: draft.emailInboxId, isDraft: true },
    })
    if (otherDrafts === 0) {
      await prisma.emailInbox.update({
        where: { id: draft.emailInboxId },
        data: { hasDraft: false },
      })
    }

    revalidatePath("/atc/backoffice")
    return { success: true }
  } catch {
    return { success: false, error: "Error al descartar borrador" }
  }
}

// ─── Regenerate Draft ───────────────────────────────────────

export async function regenerateDraft(emailInboxId: string) {
  await requirePermission("atc", "manage")

  try {
    // Delete existing drafts
    await prisma.emailReply.deleteMany({
      where: { emailInboxId, isDraft: true },
    })
    await prisma.emailInbox.update({
      where: { id: emailInboxId },
      data: { hasDraft: false },
    })

    // Generate new draft
    const { generateEmailDraft } = await import("@/modules/atc/domain/draft-generator")
    const result = await generateEmailDraft(emailInboxId)
    revalidatePath("/atc/backoffice")
    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al regenerar borrador"
    return { success: false, error: msg }
  }
}

// ─── Get Draft ──────────────────────────────────────────────

export async function getDraftForEmail(emailInboxId: string) {
  await requirePermission("atc", "read")

  const draft = await prisma.emailReply.findFirst({
    where: { emailInboxId, isDraft: true },
    orderBy: { createdAt: "desc" },
  })

  return { success: true, data: draft }
}
