"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { login } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, User, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"



export function LoginForm() {
  const t = useTranslations("login")
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    try {
      const result = await login(formData)
      if (result.success) {
        router.refresh()
        router.push("/")
      } else {
        setError(t(result.error as "invalidCredentials"))
      }
    } catch {
      setError(t("invalidCredentials"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">{t("username")}</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                placeholder="admin"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                disabled={isLoading}
                className="pl-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
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
            {t("signIn")}
          </Button>
        </div>
      </form>
    </div>
  )
}
