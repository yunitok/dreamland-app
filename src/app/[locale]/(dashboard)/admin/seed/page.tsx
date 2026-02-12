import { Header } from "@/components/layout/header"
import { SeedForm } from "@/components/admin/seed-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { prisma } from "@/lib/prisma"
import { Database, FolderKanban, Heart } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

async function getStats() {
  const [projectCount, moodCount] = await Promise.all([
    prisma.project.count(),
    prisma.teamMood.count(),
  ])

  return { projectCount, moodCount }
}

export default async function AdminSeedPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")
  
  const { projectCount, moodCount } = await getStats()

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="admin.title"
        descriptionKey="admin.description"
      />
      
      <div className="flex-1 p-4 md:p-8 space-y-8">
        {/* Current Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="premium-card rounded-xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("databaseStatus")}
              </CardTitle>
              <Database className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-500">{t("connected")}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">SQLite (dev.db)</p>
            </CardContent>
          </Card>
          
          <Card className="premium-card rounded-xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("totalProjects")}
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{projectCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">{t("inDatabase")}</p>
            </CardContent>
          </Card>
          
          <Card className="premium-card rounded-xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("teamMoods")}
              </CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{moodCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">{t("departmentsTracked")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Seed Form */}
        <SeedForm />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("jsonFormatReference")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground">
              {t("jsonDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
