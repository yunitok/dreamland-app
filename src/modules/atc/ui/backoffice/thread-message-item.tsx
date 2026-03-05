"use client"

import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import {
  Mail,
  Send,
  StickyNote,
  Paperclip,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Pencil,
  RefreshCw,
} from "lucide-react"
import { useState, useMemo } from "react"
import { formatEmailBody } from "@/modules/atc/domain/email-body-formatter"

type AttachmentInfo = {
  id: string
  fileName: string
  mimeType: string
  size: number
}

type UserInfo = {
  id: string
  name: string | null
  image: string | null
}

export type ThreadMessageType = "inbound" | "outbound" | "note" | "draft"

export interface ThreadMessage {
  type: ThreadMessageType
  id: string
  date: Date
  // Inbound
  fromEmail?: string
  fromName?: string | null
  subject?: string
  body?: string
  // Outbound + Draft
  toEmails?: string[]
  ccEmails?: string[]
  bodyHtml?: string
  replyType?: string
  sentBy?: UserInfo | null
  errorMessage?: string | null
  // Draft
  isDraft?: boolean
  draftSource?: string | null
  draftScore?: number | null
  // Note
  content?: string
  author?: UserInfo | null
  // Shared
  attachments?: AttachmentInfo[]
}

interface ThreadMessageItemProps {
  message: ThreadMessage
  onDeleteNote?: (noteId: string) => void
  onDownloadAttachment?: (attachmentId: string) => void
  onSendDraft?: (draftId: string) => void
  onEditDraft?: (draftId: string) => void
  onDiscardDraft?: (draftId: string) => void
  onRegenerateDraft?: (draftId: string) => void
  currentUserId?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const styleMap: Record<ThreadMessageType, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  inbound: {
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    label: "Recibido",
  },
  outbound: {
    bg: "bg-green-50/50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
    icon: <Send className="h-4 w-4 text-green-600 dark:text-green-400" />,
    label: "Enviado",
  },
  note: {
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    label: "Nota interna",
  },
  draft: {
    bg: "bg-violet-50/50 dark:bg-violet-950/20",
    border: "border-violet-200 dark:border-violet-800",
    icon: <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
    label: "Borrador IA",
  },
}

export function ThreadMessageItem({
  message,
  onDeleteNote,
  onDownloadAttachment,
  onSendDraft,
  onEditDraft,
  onDiscardDraft,
  onRegenerateDraft,
  currentUserId,
}: ThreadMessageItemProps) {
  const [expanded, setExpanded] = useState(true)
  const style = styleMap[message.type]
  const formattedBody = useMemo(
    () => (message.type === "inbound" && message.body ? formatEmailBody(message.body) : ""),
    [message.type, message.body]
  )

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {style.icon}
        <div className="flex-1 min-w-0">
          {message.type === "inbound" && (
            <span className="text-sm font-medium truncate">
              {message.fromName || message.fromEmail}
            </span>
          )}
          {message.type === "outbound" && (
            <span className="text-sm font-medium truncate">
              {message.sentBy?.name ?? "Agente"} → {message.toEmails?.join(", ")}
            </span>
          )}
          {message.type === "draft" && (
            <span className="text-sm font-medium truncate">
              Borrador IA → {message.toEmails?.join(", ")}
            </span>
          )}
          {message.type === "note" && (
            <span className="text-sm font-medium truncate">
              {message.author?.name ?? "Agente"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {message.errorMessage && (
            <Badge variant="destructive" className="text-[10px]">Error al enviar</Badge>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {message.attachments.length}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px]">{style.label}</Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(message.date).toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Subject for outbound/draft */}
          {(message.type === "outbound" || message.type === "draft") && message.subject && (
            <p className="text-xs text-muted-foreground">
              Asunto: {message.subject}
              {message.ccEmails && message.ccEmails.length > 0 && (
                <> · CC: {message.ccEmails.join(", ")}</>
              )}
            </p>
          )}

          {/* Content */}
          {message.type === "note" ? (
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          ) : (message.type === "outbound" || message.type === "draft") && message.bodyHtml ? (
            <div
              className="text-sm prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
            />
          ) : (
            <div
              className="text-sm prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formattedBody }}
            />
          )}

          {/* Error */}
          {message.errorMessage && (
            <p className="text-xs text-destructive">Error: {message.errorMessage}</p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => onDownloadAttachment?.(att.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted transition-colors cursor-pointer"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{att.fileName}</span>
                  <span className="text-muted-foreground">{formatBytes(att.size)}</span>
                  <Download className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Draft actions */}
          {message.type === "draft" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                onClick={() => onSendDraft?.(message.id)}
                className="h-7 text-xs gap-1.5 cursor-pointer"
              >
                <Send className="h-3 w-3" />
                Enviar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditDraft?.(message.id)}
                className="h-7 text-xs gap-1.5 cursor-pointer"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRegenerateDraft?.(message.id)}
                className="h-7 text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDiscardDraft?.(message.id)}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                Descartar
              </Button>
            </div>
          )}

          {/* Delete note */}
          {message.type === "note" && onDeleteNote && currentUserId === message.author?.id && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteNote(message.id)}
                className="h-6 text-xs text-muted-foreground hover:text-destructive gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
