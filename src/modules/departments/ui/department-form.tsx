"use client"

import { useState, useEffect } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Textarea } from "@/modules/shared/ui/textarea"
import { Slider } from "@/modules/shared/ui/slider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/modules/shared/ui/sheet"
import { createDepartment, updateDepartment, deleteDepartment } from "@/modules/departments/actions/departments"
import type { TeamMood } from "@prisma/client"
import { useTranslations } from "next-intl"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

interface DepartmentFormProps {
  department: TeamMood | null
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
}

export function DepartmentForm({
  department,
  isOpen,
  onClose,
  mode,
}: DepartmentFormProps) {
  const t = useTranslations("departments")
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    departmentName: "",
    sentimentScore: 50,
    dominantEmotion: "",
    keyConcerns: "",
  })

  // Update form when department changes
  useEffect(() => {
    if (department && mode === "edit") {
      setFormData({
        departmentName: department.departmentName,
        sentimentScore: department.sentimentScore,
        dominantEmotion: department.dominantEmotion,
        keyConcerns: department.keyConcerns || "",
      })
    } else if (mode === "create") {
      setFormData({
        departmentName: "",
        sentimentScore: 50,
        dominantEmotion: "",
        keyConcerns: "",
      })
    }
  }, [department, mode])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const data = {
        departmentName: formData.departmentName,
        sentimentScore: formData.sentimentScore,
        dominantEmotion: formData.dominantEmotion,
        keyConcerns: formData.keyConcerns || undefined,
      }

      let result
      if (mode === "create") {
        result = await createDepartment(data)
      } else if (department) {
        result = await updateDepartment(department.id, data)
      }

      if (result?.success) {
        router.refresh()
        onClose()
      }
    } catch (error) {
      console.error("Error saving department:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!department) return
    
    setIsDeleting(true)
    try {
      const result = await deleteDepartment(department.id)
      if (result.success) {
        router.refresh()
        onClose()
      }
    } catch (error) {
      console.error("Error deleting department:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getSentimentColor = (score: number) => {
    if (score < 40) return "text-red-500"
    if (score < 60) return "text-amber-500"
    if (score < 75) return "text-blue-500"
    return "text-emerald-500"
  }

  const getSentimentLabel = (score: number) => {
    if (score < 40) return t("critical")
    if (score < 60) return t("atRisk")
    if (score < 75) return t("neutral")
    return t("healthy")
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader className="pt-6">
          <SheetTitle>{mode === "create" ? t("createDepartment") : t("editDepartment")}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? t("createDepartmentDescription") : t("editDepartmentDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {/* Department Name */}
          <div className="space-y-2">
            <Label htmlFor="departmentName">{t("departmentName")}</Label>
            <Input
              id="departmentName"
              value={formData.departmentName}
              onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              placeholder={t("departmentNamePlaceholder")}
            />
          </div>

          {/* Sentiment Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("sentimentScore")}</Label>
              <span className={cn("text-lg font-bold", getSentimentColor(formData.sentimentScore))}>
                {formData.sentimentScore} - {getSentimentLabel(formData.sentimentScore)}
              </span>
            </div>
            <Slider
              value={[formData.sentimentScore]}
              onValueChange={(v) => setFormData({ ...formData, sentimentScore: v[0] })}
              min={0}
              max={100}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Crítico</span>
              <span>100 - Excelente</span>
            </div>
          </div>

          {/* Dominant Emotion */}
          <div className="space-y-2">
            <Label htmlFor="dominantEmotion">{t("dominantEmotion")}</Label>
            <Input
              id="dominantEmotion"
              value={formData.dominantEmotion}
              onChange={(e) => setFormData({ ...formData, dominantEmotion: e.target.value })}
              placeholder={t("dominantEmotionPlaceholder")}
            />
          </div>

          {/* Key Concerns */}
          <div className="space-y-2">
            <Label htmlFor="keyConcerns">{t("keyConcerns")}</Label>
            <Textarea
              id="keyConcerns"
              rows={3}
              value={formData.keyConcerns}
              onChange={(e) => setFormData({ ...formData, keyConcerns: e.target.value })}
              placeholder={t("keyConcernsPlaceholder")}
            />
          </div>
        </div>

        <SheetFooter className="pb-6">
          {showDeleteConfirm ? (
            <div className="w-full flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("confirmDelete")}
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center gap-2">
              {mode === "edit" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={isLoading || !formData.departmentName}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "create" ? t("create") : t("save")}
                </Button>
              </div>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
