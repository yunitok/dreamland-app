"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/ui/dialog"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import { Separator } from "@/modules/shared/ui/separator"
import { Mail, MailOpen, Calendar, CalendarClock, Tag, Zap, Brain } from "lucide-react"
import type { EmailRow } from "./email-inbox-tab"

interface EmailDetailDialogProps {
  email:       EmailRow | null
  onClose:     () => void
  onMarkRead:  (id: string) => void
}

const priorityLabels: Record<number, string> = {
  5: "Urgente",
  4: "Alta",
  3: "Media",
  2: "Baja",
  1: "Mínima",
}

const priorityColors: Record<number, string> = {
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export function EmailDetailDialog({ email, onClose, onMarkRead }: EmailDetailDialogProps) {
  if (!email) return null

  return (
    <Dialog open={!!email} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {email.isRead
              ? <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              : <Mail className="h-4 w-4 text-primary shrink-0" />
            }
            <span className="truncate">{email.subject}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Metadatos básicos */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">De:</span>
            {email.fromName
              ? <span>{email.fromName} &lt;{email.fromEmail}&gt;</span>
              : <span>{email.fromEmail}</span>
            }
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(email.receivedAt).toLocaleDateString("es-ES", {
                weekday: "long", day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <Separator />

        {/* Clasificación IA */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            Clasificación IA
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Categoría */}
            {email.category && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: email.category.color + "22",
                  color: email.category.color,
                  border: `1px solid ${email.category.color}44`,
                }}
              >
                <Tag className="h-3 w-3" />
                {email.category.name}
              </span>
            )}

            {/* Prioridad */}
            {email.aiPriority != null && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${priorityColors[email.aiPriority] ?? ""}`}>
                <Zap className="h-3 w-3" />
                P{email.aiPriority} — {priorityLabels[email.aiPriority]}
              </span>
            )}

            {/* Etiqueta IA */}
            {email.aiLabel && email.aiLabel !== email.category?.name && (
              <Badge variant="secondary" className="text-xs">{email.aiLabel}</Badge>
            )}

            {/* Fecha objetivo */}
            {email.targetDate && (() => {
              const target = new Date(email.targetDate)
              const now = new Date()
              now.setHours(0, 0, 0, 0)
              const daysUntil = Math.round((target.getTime() - now.getTime()) / 86400000)
              const colorClass = daysUntil <= 1
                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                : daysUntil <= 3
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              const label = daysUntil < 0 ? "Pasada" : daysUntil === 0 ? "Hoy" : daysUntil === 1 ? "Mañana" : `En ${daysUntil} días`
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
                  <CalendarClock className="h-3 w-3" />
                  {target.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })} ({label})
                </span>
              )
            })()}
          </div>

          {/* Resumen IA */}
          {email.aiSummary && (
            <p className="text-sm text-muted-foreground italic">&ldquo;{email.aiSummary}&rdquo;</p>
          )}

          {/* Confianza */}
          {email.aiConfidenceScore != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confianza:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.round(email.aiConfidenceScore * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(email.aiConfidenceScore * 100)}%
              </span>
            </div>
          )}

          {/* Sin clasificar */}
          {!email.category && !email.aiLabel && (
            <p className="text-xs text-muted-foreground">Sin clasificar automáticamente</p>
          )}
        </div>

        <Separator />

        {/* Cuerpo del email */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Contenido</p>
          <div className="rounded-lg border bg-card p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
              {email.body}
            </pre>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2">
          {!email.isRead && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onMarkRead(email.id); onClose() }}
              className="cursor-pointer"
            >
              <MailOpen className="h-4 w-4 mr-2" />
              Marcar como leído
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
