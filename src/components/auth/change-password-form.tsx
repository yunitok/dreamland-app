"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { updatePassword } from "@/lib/auth" // We will create this
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Alert, AlertDescription } from "@/modules/shared/ui/alert"
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react"
import { useTranslations } from "next-intl"

export function ChangePasswordForm() {
  const t = useTranslations("changePassword") // We need to add translations later or use hardcoded for now
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"))
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
        setError(t("passwordTooShort"))
        setIsLoading(false)
        return
    }

    try {
      const result = await updatePassword(formData)
      if (result.success) {
        setSuccess(true)
        // Redirect after a short delay
        setTimeout(() => {
            router.refresh()
            router.push("/")
        }, 1500)
      } else {
        setError(t(result.error as any))
      }
    } catch {
      setError(t("unexpectedError"))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
      return (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-500 py-4">
            <CheckCircle className="h-5 w-5" />
            <AlertDescription className="text-sm font-medium ml-2">
                {t("success")}
            </AlertDescription>
        </Alert>
      )
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          
          <div className="grid gap-2">
            <Label htmlFor="newPassword">{t("newPassword")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder={t("passwordPlaceholder")}
                disabled={isLoading}
                className="pl-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t("passwordPlaceholder")}
                disabled={isLoading}
                className="pl-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button disabled={isLoading} className="w-full font-bold h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isLoading ? t("updating") : t("updatePassword")}
          </Button>
        </div>
      </form>
    </div>
  )
}
