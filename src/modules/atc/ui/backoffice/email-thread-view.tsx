"use client"

import { useEffect, useState, useCallback, useTransition, useRef } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/modules/shared/ui/sheet"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import { Separator } from "@/modules/shared/ui/separator"
import {
  Mail,
  Reply,
  ReplyAll,
  Forward,
  StickyNote,
  Tag,
  Zap,
  Brain,
  Loader2,
  Sparkles,
} from "lucide-react"
import { getEmailThread, deleteEmailNote, getAttachmentSignedUrl } from "@/modules/atc/actions/email-management"
import { markEmailRead } from "@/modules/atc/actions/backoffice"
import { sendDraft, discardDraft, regenerateDraft } from "@/modules/atc/actions/email-drafts"
import { toast } from "sonner"
import { ThreadMessageItem, type ThreadMessage } from "./thread-message-item"
import { EmailNoteForm } from "./email-note-form"

const priorityLabels: Record<number, string> = {
  5: "Urgente", 4: "Alta", 3: "Media", 2: "Baja", 1: "Minima",
}
const priorityColors: Record<number, string> = {
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

interface EmailThreadViewProps {
  emailId: string | null
  onClose: () => void
  onCompose?: (mode: "reply" | "reply_all" | "forward", emailId: string) => void
  onEditDraft?: (draftId: string, emailId: string) => void
  currentUserId?: string
  onEmailRead?: (id: string) => void
}

export function EmailThreadView({ emailId, onClose, onCompose, onEditDraft, currentUserId, onEmailRead }: EmailThreadViewProps) {
  const [loading, setLoading] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [threadData, setThreadData] = useState<Awaited<ReturnType<typeof getEmailThread>>["data"] | null>(null)
  const [, startTransition] = useTransition()
  const onEmailReadRef = useRef(onEmailRead)
  onEmailReadRef.current = onEmailRead

  const loadThread = useCallback(async (id: string) => {
    setLoading(true)
    const result = await getEmailThread(id)
    if (result.success && result.data) {
      setThreadData(result.data)
      // Auto-mark as read
      const primary = result.data.emails.find((e) => e.id === id)
      if (primary && !primary.isRead) {
        startTransition(async () => {
          await markEmailRead(id)
          onEmailReadRef.current?.(id)
        })
      }
    } else {
      toast.error(result.error ?? "Error al cargar el hilo")
    }
    setLoading(false)
  }, [startTransition])

  useEffect(() => {
    if (emailId) loadThread(emailId)
    else setThreadData(null)
  }, [emailId, loadThread])

  // Build chronological timeline
  const timeline: ThreadMessage[] = []
  if (threadData) {
    for (const email of threadData.emails) {
      timeline.push({
        type: "inbound",
        id: email.id,
        date: new Date(email.receivedAt),
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        subject: email.subject,
        body: email.body,
        attachments: email.attachments?.map((a) => ({
          id: a.id, fileName: a.fileName, mimeType: a.mimeType, size: a.size,
        })),
      })
    }
    for (const reply of threadData.replies) {
      timeline.push({
        type: reply.isDraft ? "draft" : "outbound",
        id: reply.id,
        date: new Date(reply.createdAt),
        toEmails: reply.toEmails,
        ccEmails: reply.ccEmails,
        subject: reply.subject,
        bodyHtml: reply.bodyHtml,
        replyType: reply.replyType,
        sentBy: reply.sentByUser,
        errorMessage: reply.errorMessage,
        isDraft: reply.isDraft,
        draftSource: reply.draftSource,
        draftScore: reply.draftScore,
        attachments: reply.attachments?.map((a) => ({
          id: a.id, fileName: a.fileName, mimeType: a.mimeType, size: a.size,
        })),
      })
    }
    for (const note of threadData.notes) {
      timeline.push({
        type: "note",
        id: note.id,
        date: new Date(note.createdAt),
        content: note.content,
        author: note.author,
      })
    }
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const primaryEmail = threadData?.emails.find((e) => e.id === emailId) ?? threadData?.emails[0]

  function handleDeleteNote(noteId: string) {
    startTransition(async () => {
      const result = await deleteEmailNote(noteId)
      if (result.success) {
        toast.success("Nota eliminada")
        if (emailId) loadThread(emailId)
      } else {
        toast.error(result.error ?? "Error al eliminar la nota")
      }
    })
  }

  function handleSendDraft(draftId: string) {
    startTransition(async () => {
      const result = await sendDraft(draftId)
      if (result.success) {
        toast.success("Borrador enviado correctamente")
        if (emailId) loadThread(emailId)
      } else {
        toast.error(result.error ?? "Error al enviar borrador")
      }
    })
  }

  function handleEditDraft(draftId: string) {
    if (primaryEmail) {
      onEditDraft?.(draftId, primaryEmail.id)
    }
  }

  function handleDiscardDraft(draftId: string) {
    startTransition(async () => {
      const result = await discardDraft(draftId)
      if (result.success) {
        toast.success("Borrador descartado")
        if (emailId) loadThread(emailId)
      } else {
        toast.error(result.error ?? "Error al descartar borrador")
      }
    })
  }

  function handleRegenerateDraft() {
    if (!primaryEmail) return
    setGeneratingDraft(true)
    startTransition(async () => {
      const result = await regenerateDraft(primaryEmail.id)
      setGeneratingDraft(false)
      if (result.success) {
        toast.success("Borrador regenerado")
        if (emailId) loadThread(emailId)
      } else {
        toast.error(result.error ?? "Error al regenerar borrador")
      }
    })
  }

  function handleDownloadAttachment(attachmentId: string) {
    startTransition(async () => {
      const result = await getAttachmentSignedUrl(attachmentId)
      if (result.success && result.data) {
        window.open(result.data.url, "_blank")
      } else {
        toast.error(result.error ?? "Error al descargar el adjunto")
      }
    })
  }

  return (
    <Sheet open={!!emailId} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-hidden flex flex-col"
      >
        {loading ? (
          <>
            <SheetHeader>
              <SheetTitle>Cargando hilo...</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : primaryEmail ? (
          <>
            {/* Header */}
            <SheetHeader className="shrink-0">
              <SheetTitle className="flex items-center gap-2 text-base min-w-0 pr-8">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{primaryEmail.subject}</span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 items-center">
                {primaryEmail.category && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: primaryEmail.category.color + "22",
                      color: primaryEmail.category.color,
                      border: `1px solid ${primaryEmail.category.color}44`,
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    {primaryEmail.category.name}
                  </span>
                )}
                {primaryEmail.aiPriority != null && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[primaryEmail.aiPriority] ?? ""}`}>
                    <Zap className="h-3 w-3" />
                    P{primaryEmail.aiPriority} {priorityLabels[primaryEmail.aiPriority]}
                  </span>
                )}
                {primaryEmail.aiSummary && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Brain className="h-3 w-3" />
                    {primaryEmail.aiSummary}
                  </span>
                )}
                {threadData && threadData.emails.length > 1 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {threadData.emails.length} mensajes en el hilo
                  </Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            <Separator />

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {timeline.map((msg) => (
                <ThreadMessageItem
                  key={`${msg.type}-${msg.id}`}
                  message={msg}
                  onDeleteNote={handleDeleteNote}
                  onDownloadAttachment={handleDownloadAttachment}
                  onSendDraft={handleSendDraft}
                  onEditDraft={handleEditDraft}
                  onDiscardDraft={handleDiscardDraft}
                  onRegenerateDraft={handleRegenerateDraft}
                  currentUserId={currentUserId}
                />
              ))}
            </div>

            <Separator />

            {/* Note form */}
            <div className="shrink-0 px-4 pb-2">
              <EmailNoteForm
                emailInboxId={primaryEmail.id}
                onNoteAdded={() => { if (emailId) loadThread(emailId) }}
              />
            </div>

            {/* Actions */}
            <div className="shrink-0 flex flex-wrap gap-2 p-4 pt-3">
              <Button
                size="sm"
                variant="default"
                onClick={() => onCompose?.("reply", primaryEmail.id)}
                className="gap-2 cursor-pointer"
              >
                <Reply className="h-4 w-4" />
                Responder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCompose?.("reply_all", primaryEmail.id)}
                className="gap-2 cursor-pointer"
              >
                <ReplyAll className="h-4 w-4" />
                Responder a todos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCompose?.("forward", primaryEmail.id)}
                className="gap-2 cursor-pointer"
              >
                <Forward className="h-4 w-4" />
                Reenviar
              </Button>
              {!timeline.some((m) => m.type === "draft") && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRegenerateDraft}
                  disabled={generatingDraft}
                  className="gap-2 cursor-pointer ml-auto"
                >
                  {generatingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generatingDraft ? "Generando borrador..." : "Generar borrador IA"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Email no encontrado</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Email no encontrado
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
