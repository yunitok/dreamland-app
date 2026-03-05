"use client"

import { useState, useTransition } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Textarea } from "@/modules/shared/ui/textarea"
import { StickyNote, Loader2 } from "lucide-react"
import { addEmailNote } from "@/modules/atc/actions/email-management"
import { toast } from "sonner"

interface EmailNoteFormProps {
  emailInboxId: string
  onNoteAdded?: () => void
}

export function EmailNoteForm({ emailInboxId, onNoteAdded }: EmailNoteFormProps) {
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!content.trim()) return
    startTransition(async () => {
      const result = await addEmailNote({ emailInboxId, content: content.trim() })
      if (result.success) {
        setContent("")
        toast.success("Nota añadida")
        onNoteAdded?.()
      } else {
        toast.error(result.error ?? "Error al añadir la nota")
      }
    })
  }

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <StickyNote className="h-4 w-4" />
        Nota interna
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe una nota interna (solo visible para el equipo)..."
        rows={2}
        maxLength={2000}
        className="bg-background"
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{content.length}/2000</span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
          className="gap-2 cursor-pointer"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
          Añadir nota
        </Button>
      </div>
    </div>
  )
}
