"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Alert, AlertDescription } from "@/modules/shared/ui/alert"
import { updateProfile } from "@/app/actions/profile-actions"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ProfileInfoFormProps {
  user: {
    name?: string | null
    username: string
    email?: string | null
  }
}

export function ProfileInfoForm({ user }: ProfileInfoFormProps) {
  const t = useTranslations("profile.personalInfo")
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result = await updateProfile(formData)

    setIsLoading(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } else {
      setError(t(`errors.${result.error}`))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {success && (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {t("saved")}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={user.name || ""}
          placeholder="Juan Pérez"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          name="username"
          type="text"
          defaultValue={user.username}
          placeholder="juanperez"
          readOnly
          disabled
          className="cursor-not-allowed opacity-60 bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email || ""}
          placeholder="juan@ejemplo.com"
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full cursor-pointer">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("save")}
      </Button>
    </form>
  )
}
