
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { LockKeyhole } from "lucide-react"
import { AuthHeader } from "@/components/auth/auth-header"

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("changePassword")

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <AuthHeader />
      {/* AI Glow Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-violet-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-[400px] px-4">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20 mb-4">
            <LockKeyhole className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-1 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-sm font-medium text-muted-foreground/80 tracking-wide">
            {t("subTitle")}
          </p>
        </div>

        {/* Form Box */}
        <div className="premium-card rounded-2xl p-8 border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <ChangePasswordForm />
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-muted-foreground/60 animate-in fade-in duration-1000 delay-300">
          {t("footer")}
        </p>
      </div>
    </div>
  )
}
