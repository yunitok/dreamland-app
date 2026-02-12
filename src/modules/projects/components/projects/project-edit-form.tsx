"use client"

import { useState, useEffect } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Textarea } from "@/modules/shared/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/modules/shared/ui/sheet"
import { updateProject, deleteProject, createProject } from "@/modules/projects/actions/projects"
import type { Project } from "@prisma/client"
import { useTranslations } from "next-intl"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "@/i18n/navigation"

interface ProjectEditFormProps {
  project: Project | null
  departments: string[]
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
}

const PRIORITIES = ["High", "Medium", "Low"] as const
const TYPES = ["Problem", "Idea"] as const
const STATUSES = ["Active", "Pending", "Done"] as const

export function ProjectEditForm({
  project,
  departments,
  isOpen,
  onClose,
  mode,
}: ProjectEditFormProps) {
  const t = useTranslations("projects")
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: departments[0] || "",
    priority: "Medium",
    type: "Idea",
    status: "Pending",
    sourceQuote: "",
  })

  // Update form when project changes or mode changes
  useEffect(() => {
    if (mode === "edit" && project) {
      setFormData({
        title: project.title,
        description: project.description,
        department: project.department,
        priority: project.priority,
        type: project.type,
        status: project.status,
        sourceQuote: project.sourceQuote || "",
      })
    } else if (mode === "create") {
      setFormData({
        title: "",
        description: "",
        department: departments[0] || "",
        priority: "Medium",
        type: "Idea",
        status: "Pending",
        sourceQuote: "",
      })
    }
    setShowDeleteConfirm(false)
  }, [project, mode, departments])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      let result
      if (mode === "create") {
        result = await createProject(formData)
      } else if (project) {
        result = await updateProject(project.id, formData)
      }

      if (result?.success) {
        router.refresh()
        onClose()
      }
    } catch (error) {
      console.error("Error saving project:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    
    setIsDeleting(true)
    try {
      const result = await deleteProject(project.id)
      if (result.success) {
        router.refresh()
        onClose()
      }
    } catch (error) {
      console.error("Error deleting project:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      High: t("high"),
      Medium: t("medium"),
      Low: t("low"),
    }
    return labels[priority] || priority
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Problem: t("problem"),
      Idea: t("idea"),
    }
    return labels[type] || type
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Active: t("active"),
      Pending: t("pending"),
      Done: t("done"),
    }
    return labels[status] || status
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader className="pt-6">
          <SheetTitle>{mode === "create" ? t("createProject") : t("editProject")}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? t("createProjectDescription") : t("editProjectDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("titleLabel")}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>{t("department")}</Label>
            <Select
              value={formData.department}
              onValueChange={(v: string) => setFormData({ ...formData, department: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>{t("priority")}</Label>
            <Select
              value={formData.priority}
              onValueChange={(v: string) => setFormData({ ...formData, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {getPriorityLabel(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>{t("type")}</Label>
            <Select
              value={formData.type}
              onValueChange={(v: string) => setFormData({ ...formData, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>{t("status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(v: string) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Quote */}
          <div className="space-y-2">
            <Label htmlFor="sourceQuote">{t("sourceQuote")}</Label>
            <Textarea
              id="sourceQuote"
              rows={2}
              value={formData.sourceQuote}
              onChange={(e) => setFormData({ ...formData, sourceQuote: e.target.value })}
              className="text-sm italic"
              placeholder={t("sourceQuotePlaceholder")}
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
                <Button onClick={handleSave} disabled={isLoading || !formData.title || !formData.description}>
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
