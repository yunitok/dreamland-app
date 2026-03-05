"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Badge } from "@/modules/shared/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/ui/dialog"
import { Send, Loader2, X } from "lucide-react"
import { TiptapEditor } from "./tiptap-editor"
import { TemplateSelector } from "./template-selector"
import { EmailAttachmentZone, type PendingAttachment } from "./email-attachment-zone"
import { sendEmailReply } from "@/modules/atc/actions/email-management"
import { editAndSendDraft } from "@/modules/atc/actions/email-drafts"
import { toast } from "sonner"

export type ComposerMode = "reply" | "reply_all" | "forward" | "edit_draft" | null

interface ComposerContext {
  emailInboxId: string
  fromEmail: string
  fromName?: string | null
  subject: string
  body: string
  toEmails?: string[]
  ccEmails?: string[]
  // Draft editing
  draftId?: string
  draftBodyHtml?: string
}

interface EmailComposerProps {
  mode: ComposerMode
  context: ComposerContext | null
  onClose: () => void
  onSent?: () => void
}

const modeLabels: Record<string, string> = {
  reply: "Responder",
  reply_all: "Responder a todos",
  forward: "Reenviar",
  edit_draft: "Editar borrador IA",
}

function buildQuote(fromName: string | null | undefined, fromEmail: string, body: string): string {
  const date = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const sender = fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail
  return `<br/><blockquote style="border-left:2px solid #ccc;padding-left:8px;margin:8px 0;color:#666"><p>El ${date}, ${sender} escribió:</p><p>${body.replace(/\n/g, "<br/>")}</p></blockquote>`
}

export function EmailComposer({ mode, context, onClose, onSent }: EmailComposerProps) {
  const [toEmails, setToEmails] = useState<string[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [toInput, setToInput] = useState("")
  const [ccInput, setCcInput] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [isPending, startTransition] = useTransition()

  // Initialize fields based on mode
  useEffect(() => {
    if (!mode || !context) return

    if (mode === "reply") {
      setToEmails([context.fromEmail])
      setCcEmails([])
      setSubject(context.subject.startsWith("Re:") ? context.subject : `Re: ${context.subject}`)
      setBodyHtml(buildQuote(context.fromName, context.fromEmail, context.body))
    } else if (mode === "reply_all") {
      const allTo = [context.fromEmail, ...(context.toEmails ?? [])].filter(
        (e, i, arr) => arr.indexOf(e) === i && e !== "contacto@restaurantevoltereta.com"
      )
      setToEmails(allTo)
      setCcEmails(context.ccEmails?.filter((e) => e !== "contacto@restaurantevoltereta.com") ?? [])
      setSubject(context.subject.startsWith("Re:") ? context.subject : `Re: ${context.subject}`)
      setBodyHtml(buildQuote(context.fromName, context.fromEmail, context.body))
    } else if (mode === "forward") {
      setToEmails([])
      setCcEmails([])
      setSubject(context.subject.startsWith("Fwd:") ? context.subject : `Fwd: ${context.subject}`)
      setBodyHtml(buildQuote(context.fromName, context.fromEmail, context.body))
    } else if (mode === "edit_draft") {
      setToEmails(context.toEmails ?? [context.fromEmail])
      setCcEmails(context.ccEmails ?? [])
      setSubject(context.subject.startsWith("Re:") ? context.subject : `Re: ${context.subject}`)
      setBodyHtml(context.draftBodyHtml ?? "")
    }

    setAttachments([])
  }, [mode, context])

  const addEmail = useCallback((list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const email = input.trim()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email inválido")
      return
    }
    if (!list.includes(email)) {
      setList([...list, email])
    }
    setInput("")
  }, [])

  function handleAddFiles(files: File[]) {
    const newAttachments: PendingAttachment[] = files.map((f) => ({
      id: crypto.randomUUID(),
      fileName: f.name,
      mimeType: f.type || "application/octet-stream",
      size: f.size,
      file: f,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  function handleSend() {
    if (!context || !mode) return
    if (toEmails.length === 0) {
      toast.error("Añade al menos un destinatario")
      return
    }
    if (!bodyHtml || bodyHtml === "<p></p>") {
      toast.error("El mensaje no puede estar vacío")
      return
    }

    startTransition(async () => {
      if (mode === "edit_draft" && context.draftId) {
        const result = await editAndSendDraft(context.draftId, {
          bodyHtml,
          toEmails,
          ccEmails,
          subject,
        })
        if (result.success) {
          toast.success("Borrador editado y enviado")
          onSent?.()
          onClose()
        } else {
          toast.error(result.error ?? "Error al enviar el borrador")
        }
        return
      }

      const replyType = mode === "reply" ? "REPLY" : mode === "reply_all" ? "REPLY_ALL" : "FORWARD"
      const result = await sendEmailReply({
        emailInboxId: context.emailInboxId,
        replyType,
        toEmails,
        ccEmails,
        subject,
        bodyHtml,
        attachmentIds: attachments.filter((a) => !a.file).map((a) => a.id),
      })
      if (result.success) {
        toast.success("Email enviado correctamente")
        onSent?.()
        onClose()
      } else {
        toast.error(result.error ?? "Error al enviar el email")
      }
    })
  }

  return (
    <Dialog open={!!mode} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode ? modeLabels[mode] : "Componer"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* To */}
          <div className="space-y-1.5">
            <Label>Para</Label>
            <div className="flex flex-wrap gap-1.5 items-center rounded-md border p-2 min-h-[38px]">
              {toEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 text-xs">
                  {email}
                  <button
                    type="button"
                    onClick={() => setToEmails((prev) => prev.filter((e) => e !== email))}
                    className="cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addEmail(toEmails, setToEmails, toInput, setToInput)
                  }
                }}
                onBlur={() => {
                  if (toInput.trim()) addEmail(toEmails, setToEmails, toInput, setToInput)
                }}
                placeholder="email@ejemplo.com"
                className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[150px] h-6 p-0"
              />
            </div>
          </div>

          {/* CC */}
          <div className="space-y-1.5">
            <Label>CC</Label>
            <div className="flex flex-wrap gap-1.5 items-center rounded-md border p-2 min-h-[38px]">
              {ccEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 text-xs">
                  {email}
                  <button
                    type="button"
                    onClick={() => setCcEmails((prev) => prev.filter((e) => e !== email))}
                    className="cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addEmail(ccEmails, setCcEmails, ccInput, setCcInput)
                  }
                }}
                onBlur={() => {
                  if (ccInput.trim()) addEmail(ccEmails, setCcEmails, ccInput, setCcInput)
                }}
                placeholder="cc@ejemplo.com"
                className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[150px] h-6 p-0"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Asunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          {/* Editor */}
          <div className="space-y-1.5">
            <Label>Mensaje</Label>
            <TiptapEditor
              content={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Escribe tu respuesta..."
            />
          </div>

          {/* Attachments */}
          <EmailAttachmentZone
            attachments={attachments}
            onAdd={handleAddFiles}
            onRemove={handleRemoveAttachment}
          />

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <TemplateSelector
              categoryId={context?.emailInboxId ? undefined : undefined}
              variables={{
                nombre: context?.fromName ?? "",
                email: context?.fromEmail ?? "",
                asunto: context?.subject ?? "",
                fecha: new Date().toLocaleDateString("es-ES"),
              }}
              onSelect={(s, b) => { setSubject(s); setBodyHtml(b) }}
            />
            <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isPending || toEmails.length === 0}
              className="gap-2 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
