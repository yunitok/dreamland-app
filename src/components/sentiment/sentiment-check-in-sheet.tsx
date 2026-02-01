"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTeamMood, updateTeamMood, deleteTeamMood } from "@/lib/actions/sentiment"
import { useTranslations } from "next-intl"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import * as Slider from "@radix-ui/react-slider"

interface TeamMood {
  id: string
  departmentName: string
  sentimentScore: number
  dominantEmotion: string
  keyConcerns?: string | null
  detectedAt: Date
}

interface SentimentCheckInSheetProps {
  mood: TeamMood | null
  departments: string[]
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
}

export function SentimentCheckInSheet({
  mood,
  departments,
  isOpen,
  onClose,
  mode,
}: SentimentCheckInSheetProps) {
  const t = useTranslations("sentiment")
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
    detectedAt: new Date().toISOString().split('T')[0],
  })

  // Update form when mood changes
  useEffect(() => {
    if (mood && mode === "edit") {
      setFormData({
        departmentName: mood.departmentName,
        sentimentScore: mood.sentimentScore,
        dominantEmotion: mood.dominantEmotion,
        keyConcerns: mood.keyConcerns || "",
        detectedAt: new Date(mood.detectedAt).toISOString().split('T')[0],
      })
    } else if (mode === "create") {
      setFormData({
        departmentName: "",
        sentimentScore: 50,
        dominantEmotion: "",
        keyConcerns: "",
        detectedAt: new Date().toISOString().split('T')[0],
      })
    }
    setShowDeleteConfirm(false)
  }, [mood, mode, isOpen])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const data = {
        departmentName: formData.departmentName,
        sentimentScore: formData.sentimentScore,
        dominantEmotion: formData.dominantEmotion,
        keyConcerns: formData.keyConcerns || undefined,
        detectedAt: new Date(formData.detectedAt),
      }

      if (mode === "create") {
        await createTeamMood(data)
      } else if (mood) {
        await updateTeamMood(mood.id, data)
      }

      router.refresh()
      onClose()
    } catch (error) {
      console.error("Error saving check-in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!mood) return
    
    setIsDeleting(true)
    try {
      const result = await deleteTeamMood(mood.id)
      if (result.success) {
        router.refresh()
        onClose()
      }
    } catch (error) {
      console.error("Error deleting check-in:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getZoneColor = (score: number) => {
    if (score < 40) return "bg-red-500 shadow-red-500/50"
    if (score < 70) return "bg-orange-500 shadow-orange-500/50"
    return "bg-emerald-500 shadow-emerald-500/50"
  }

  const getZoneLabel = (score: number) => {
    if (score < 40) return t("criticalLabel")
    if (score < 70) return t("stableLabel")
    return t("healthyLabel")
  }

  const getZoneTextColor = (score: number) => {
    if (score < 40) return "text-red-500"
    if (score < 70) return "text-orange-500"
    return "text-emerald-500"
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader className="pt-6">
          <SheetTitle>
            {mode === "create" ? t("newCheckInTitle") : t("editCheckInTitle")}
          </SheetTitle>
          <SheetDescription>
            {mode === "create" ? t("newCheckInDescription") : t("editCheckInDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {/* Department Name */}
          <div className="space-y-2">
            <Label htmlFor="departmentName">{t("departmentLabel")}</Label>
            <Select 
              value={formData.departmentName} 
              onValueChange={(value) => setFormData({ ...formData, departmentName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectDepartment")} />
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="detectedAt">{t("dateLabel")}</Label>
            <Input
              id="detectedAt"
              type="date"
              className="w-auto"
              value={formData.detectedAt}
              onChange={(e) => setFormData({ ...formData, detectedAt: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{t("dateHint")}</p>
          </div>

          {/* Sentiment Score with Zone Selector */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between">
              <Label>{t("zoneLabel")}</Label>
              <span className={cn("text-lg font-bold", getZoneTextColor(formData.sentimentScore))}>
                {formData.sentimentScore} - {getZoneLabel(formData.sentimentScore)}
              </span>
            </div>
            
            <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              <span className="text-red-500">{t("criticalLabel")} (0-39)</span>
              <span className="text-orange-500">{t("stableLabel")} (40-69)</span>
              <span className="text-emerald-500">{t("healthyLabel")} (70-100)</span>
            </div>

            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-10"
              value={[formData.sentimentScore]}
              onValueChange={(v) => setFormData({ ...formData, sentimentScore: v[0] })}
              max={100}
              step={1}
            >
              <Slider.Track className="bg-secondary relative grow rounded-full h-3 overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 opacity-30" />
                <Slider.Range className="absolute h-full bg-transparent" />
              </Slider.Track>
              <Slider.Thumb
                className={cn(
                  "block w-6 h-6 rounded-full border-4 border-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-lg cursor-grab active:cursor-grabbing",
                  getZoneColor(formData.sentimentScore)
                )}
                aria-label="Sentiment Score"
              />
            </Slider.Root>
          </div>

          {/* Dominant Emotion */}
          <div className="space-y-2">
            <Label htmlFor="dominantEmotion">{t("emotionLabel")}</Label>
            <Input
              id="dominantEmotion"
              value={formData.dominantEmotion}
              onChange={(e) => setFormData({ ...formData, dominantEmotion: e.target.value })}
              placeholder={t("emotionPlaceholder")}
            />
          </div>

          {/* Key Concerns */}
          <div className="space-y-2">
            <Label htmlFor="keyConcerns">{t("concernsLabel")}</Label>
            <Textarea
              id="keyConcerns"
              rows={3}
              value={formData.keyConcerns}
              onChange={(e) => setFormData({ ...formData, keyConcerns: e.target.value })}
              placeholder={t("concernsPlaceholder")}
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
