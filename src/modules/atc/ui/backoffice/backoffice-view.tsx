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
import { Settings, Trash2 } from "lucide-react"
import { EmailInboxTab, type EmailRow } from "./email-inbox-tab"
import { deleteAllEmails } from "@/modules/atc/actions/backoffice"
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
  emails:     EmailRow[]
  categories: CategoryInfo[]
  canDelete?: boolean
}

export function BackofficeView({ emails, categories, canDelete }: BackofficeViewProps) {
  const router = useRouter()
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [isPending, startTransition] = useTransition()

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
          <Link href="/atc/backoffice/categories">
            <Settings className="h-4 w-4" />
            Categorías
          </Link>
        </Button>
      </div>

      <EmailInboxTab emails={emails} categories={categories} canDelete={canDelete} />

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
