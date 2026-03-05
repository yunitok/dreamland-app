"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/modules/shared/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/shared/ui/alert-dialog"
import { Settings, Trash2, FileText } from "lucide-react"
import { EmailInboxTab, type EmailRow } from "./email-inbox-tab"
import { EmailComposer, type ComposerMode } from "./email-composer"
import { deleteAllEmails } from "@/modules/atc/actions/backoffice"
import { getDraftForEmail } from "@/modules/atc/actions/email-drafts"
import { toast } from "sonner"
import Link from "next/link"

type CategoryInfo = {
  id:       string
  name:     string
  color:    string
  icon:     string | null
  slug:     string
  parentId: string | null
}

interface BackofficeViewProps {
  emails:        EmailRow[]
  categories:    CategoryInfo[]
  canDelete?:    boolean
  currentUserId?: string
}

export function BackofficeView({ emails, categories, canDelete, currentUserId }: BackofficeViewProps) {
  const router = useRouter()
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [composerMode, setComposerMode] = useState<ComposerMode>(null)
  const [composerEmailId, setComposerEmailId] = useState<string | null>(null)
  const [draftContext, setDraftContext] = useState<{ draftId: string; draftBodyHtml: string } | null>(null)

  const handleDeleteAll = () => {
    startTransition(async () => {
      const result = await deleteAllEmails()
      if (result.success) {
        toast.success(`${result.data?.count ?? 0} emails eliminados`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Error al eliminar los emails")
      }
      setShowDeleteAll(false)
    })
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteAll(true)}
            disabled={isPending || emails.length === 0}
            className="gap-2 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Borrar todos los emails
          </Button>
        )}
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/atc/backoffice/templates">
            <FileText className="h-4 w-4" />
            Plantillas
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/atc/backoffice/categories">
            <Settings className="h-4 w-4" />
            Categorías
          </Link>
        </Button>
      </div>

      <EmailInboxTab
        emails={emails}
        categories={categories}
        canDelete={canDelete}
        currentUserId={currentUserId}
        onCompose={(mode, emailId) => {
          setDraftContext(null)
          setComposerMode(mode)
          setComposerEmailId(emailId)
        }}
        onEditDraft={async (draftId, emailId) => {
          const result = await getDraftForEmail(emailId)
          if (result.success && result.data) {
            setDraftContext({ draftId: result.data.id, draftBodyHtml: result.data.bodyHtml })
            setComposerEmailId(emailId)
            setComposerMode("edit_draft")
          } else {
            toast.error("No se encontró el borrador")
          }
        }}
      />

      {/* Compositor de emails */}
      <EmailComposer
        mode={composerMode}
        context={(() => {
          if (!composerEmailId) return null
          const email = emails.find((e) => e.id === composerEmailId)
          if (!email) return null
          return {
            emailInboxId: email.id,
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            subject: email.subject,
            body: email.body,
            ...(draftContext ?? {}),
          }
        })()}
        onClose={() => { setComposerMode(null); setComposerEmailId(null); setDraftContext(null) }}
        onSent={() => router.refresh()}
      />

      {/* AlertDialog para borrado masivo */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar TODOS los emails</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todos los emails sincronizados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
