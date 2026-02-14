"use client"

import { useState, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/modules/shared/ui/button"
import { Alert, AlertDescription } from "@/modules/shared/ui/alert"
import { uploadAvatar, deleteAvatar } from "@/app/actions/profile-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/modules/shared/ui/avatar"
import { Loader2, Upload, Trash2, ImagePlus, CheckCircle, AlertCircle } from "lucide-react"

interface AvatarUploadSectionProps {
  user: {
    id: string
    name?: string | null
    username: string
    image?: string | null
  }
}

export function AvatarUploadSection({ user }: AvatarUploadSectionProps) {
  const t = useTranslations("profile.avatar")
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generar iniciales
  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user.username.slice(0, 2).toUpperCase()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setSuccess(null)
    
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError(t("errors.invalidType"))
      return
    }

    // Validar tamaño
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError(t("errors.tooLarge"))
      return
    }

    setSelectedFile(file)
    
    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setSuccess(null)
    
    const formData = new FormData()
    formData.append("avatar", selectedFile)

    const result = await uploadAvatar(formData)
    setIsUploading(false)

    if (result.success) {
      setSuccess(t("uploaded"))
      setPreviewUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } else {
      setError(t(`errors.${result.error}`))
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    setSuccess(null)
    
    const result = await deleteAvatar()
    setIsDeleting(false)

    if (result.success) {
      setSuccess(t("deleted"))
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } else {
      setError(t(`errors.${result.error || "deleteFailed"}`))
    }
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center gap-6">
        {/* Avatar Preview */}
        <Avatar className="h-32 w-32 ring-4 ring-border shadow-lg" data-size="lg">
          <AvatarImage src={previewUrl || user.image || undefined} />
          <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-violet-500 to-purple-500 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* File Input */}
        <div className="w-full max-w-md">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <ImagePlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("dragDrop")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("maxSize")} • {t("acceptedFormats")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full max-w-md">
          {selectedFile ? (
            <>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 cursor-pointer"
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isUploading && <Upload className="mr-2 h-4 w-4" />}
                {t("upload")}
              </Button>
              <Button
                onClick={() => {
                  setSelectedFile(null)
                  setPreviewUrl(null)
                  setError(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
                variant="outline"
                disabled={isUploading}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
            </>
          ) : (
            user.image && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
                className="flex-1 cursor-pointer"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isDeleting && <Trash2 className="mr-2 h-4 w-4" />}
                {t("delete")}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
