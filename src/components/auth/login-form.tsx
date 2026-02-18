"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { login } from "@/lib/auth"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Alert, AlertDescription } from "@/modules/shared/ui/alert"
import { Checkbox } from "@/modules/shared/ui/checkbox"
import { Loader2, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"



export function LoginForm() {
  const t = useTranslations("login")
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className="pl-10 pr-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" name="remember" />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("rememberMe")}
            </label>
          </div>
          {error && (
            <Alert variant="destructive" className="flex w-full items-center justify-center gap-2 bg-destructive/10 border-destructive/20 text-destructive py-3 [&>svg]:static [&>svg~*]:pl-0 [&>svg+div]:translate-y-0">
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
