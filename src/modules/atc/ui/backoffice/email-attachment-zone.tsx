"use client"

import { useState, useRef } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Paperclip, X, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

export type PendingAttachment = {
  id: string
  fileName: string
  mimeType: string
  size: number
  file?: File
}

interface EmailAttachmentZoneProps {
  attachments: PendingAttachment[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  uploading?: boolean
  maxSizeMb?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function EmailAttachmentZone({
  attachments,
  onAdd,
  onRemove,
  uploading,
  maxSizeMb = 10,
}: EmailAttachmentZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const maxBytes = maxSizeMb * 1048576
    const valid: File[] = []
    for (const file of Array.from(files)) {
      if (file.size > maxBytes) {
        toast.error(`${file.name} supera el limite de ${maxSizeMb}MB`)
        continue
      }
      valid.push(file)
    }
    if (valid.length > 0) onAdd(valid)
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`flex items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span>Arrastra archivos o haz click para adjuntar</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[150px] truncate">{att.fileName}</span>
              <span className="text-muted-foreground">{formatBytes(att.size)}</span>
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
