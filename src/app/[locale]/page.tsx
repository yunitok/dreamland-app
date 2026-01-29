import { Header } from "@/components/layout/header"
import { KPICard } from "@/components/dashboard/kpi-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { prisma } from "@/lib/prisma"
import { 
  FolderKanban, 
  AlertTriangle, 
  HeartCrack,
  TrendingUp
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

async function getDashboardData() {
  const [totalProjects, criticalProjects, recentProjects, teamMoods] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { priority: "High" } }),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMood.findMany({
      orderBy: { sentimentScore: "asc" },
    }),
  ])

  const mostStressedDept = teamMoods[0]

  return {
    totalProjects,
    criticalProjects,
    recentProjects,
    mostStressedDept,
  }
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("dashboard")
  
  const { totalProjects, criticalProjects, recentProjects, mostStressedDept } = 
    await getDashboardData()

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="dashboard.title"
        descriptionKey="dashboard.description"
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title={t("totalProjects")}
            value={totalProjects}
            description={t("activeInPipeline")}
            icon={FolderKanban}
          />
          <KPICard
            title={t("criticalProjects")}
            value={criticalProjects}
            description={t("highPriorityItems")}
            icon={AlertTriangle}
            variant="critical"
          />
          <KPICard
            title={t("mostStressed")}
            value={mostStressedDept?.departmentName || "N/A"}
            description={`${t("score")}: ${mostStressedDept?.sentimentScore || 0}/100`}
            icon={HeartCrack}
            variant="warning"
          />
          <KPICard
            title={t("activeInitiatives")}
            value={recentProjects.filter(p => p.status === "Active").length}
            description={t("currentlyInProgress")}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivity projects={recentProjects} />
          
          {/* Team Insights Card */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-base font-semibold mb-4">{t("teamSentimentOverview")}</h3>
            <div className="space-y-3">
              {mostStressedDept && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div>
                    <p className="text-sm font-medium">{mostStressedDept.departmentName}</p>
                    <p className="text-xs text-muted-foreground">{mostStressedDept.dominantEmotion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-500">{mostStressedDept.sentimentScore}</p>
                    <p className="text-xs text-muted-foreground">{t("stressLevel")}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                {mostStressedDept?.keyConcerns}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
