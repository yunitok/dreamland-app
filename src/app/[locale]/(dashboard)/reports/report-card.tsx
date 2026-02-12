"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { FileText, Calendar, ArrowRight, Trash2, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/modules/shared/ui/card"
import { Button } from "@/modules/shared/ui/button"
import { deleteReport } from "@/lib/actions/reports"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/shared/ui/alert-dialog"
import { useTranslations } from "next-intl"

interface ReportCardProps {
  report: {
    id: string
    title: string
    content: string
    createdAt: Date | string
    project?: { title: string } | null
  }
}

export function ReportCard({ report }: ReportCardProps) {
  const router = useRouter()
  const t = useTranslations("reports")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteReport(report.id)
      if (result.success) {
        router.refresh()
      } else {
        console.error("Failed to delete report")
        setIsDeleting(false)
      }
    } catch (error) {
      console.error("Error deleting report:", error)
      setIsDeleting(false)
    }
  }

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow relative group overflow-hidden py-0 gap-0">
      <CardHeader className="pt-6 pb-3 px-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {report.title}
            </CardTitle>
            <CardDescription>
              {report.project?.title || 'Sin Proyecto Asignado'}
            </CardDescription>
          </div>
          <div className="bg-primary/10 text-primary p-2 rounded-full">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-6 px-6">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          {format(new Date(report.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
        </div>
        <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
          {report.content.replace(/[#*]/g, '').substring(0, 150)}...
        </p>
      </CardContent>
      <CardFooter className="py-4 border-t bg-muted/30 flex gap-2 px-6">
        <Button asChild className="flex-1" variant="outline">
          <Link href={`/reports/${report.id}`}>
            {t("viewReport")} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteReport")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirmation")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
