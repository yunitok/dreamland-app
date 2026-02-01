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
    <div className="flex flex-col ai-glow min-h-full">
      <Header 
        titleKey="dashboard.title"
        descriptionKey="dashboard.description"
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* AI Strategic Advisor - Priority 1 */}
        <div className="premium-card rounded-xl p-6 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-primary">
              {t("aiAdvisor")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t("predictiveAnalysis")}</p>
              <p className="text-lg font-semibold leading-tight">
                {criticalProjects > 0 
                  ? `Se detectaron ${criticalProjects} riesgos críticos que requieren atención inmediata para estabilizar el trimestre.`
                  : "El portafolio se mantiene estable. Buen momento para introducir nuevas iniciativas de innovación."}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t("teamSentimentOverview")}</p>
              <p className="text-lg font-semibold leading-tight">
                {mostStressedDept && mostStressedDept.sentimentScore < 50
                  ? `Alerta: El departamento de ${mostStressedDept.departmentName} muestra signos de agotamiento. Se recomienda revisión de carga de trabajo.`
                  : "La moral colectiva es saludable. El ritmo de ejecución es sostenible."}
              </p>
            </div>
            <div className="hidden lg:flex flex-col justify-center border-l pl-6 border-primary/10">
              <p className="text-xs text-muted-foreground italic">
                &quot;Basado en los datos actuales, priorizar la resolución del proyecto más antiguo de alta prioridad mejorará la moral en un 15%.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards - Responsive Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title={t("totalProjects")}
            value={totalProjects}
            description={t("activeInPipeline")}
            icon={FolderKanban}
            className="premium-card"
          />
          <KPICard
            title={t("criticalProjects")}
            value={criticalProjects}
            description={t("highPriorityItems")}
            icon={AlertTriangle}
            variant="critical"
            className="premium-card"
          />
          <KPICard
            title={t("mostStressed")}
            value={mostStressedDept?.departmentName || "N/A"}
            description={`${t("score")}: ${mostStressedDept?.sentimentScore || 0}/100`}
            icon={HeartCrack}
            variant="warning"
            className="premium-card"
          />
          <KPICard
            title={t("activeInitiatives")}
            value={recentProjects.filter(p => p.status === "Active").length}
            description={t("currentlyInProgress")}
            icon={TrendingUp}
            variant="success"
            className="premium-card"
          />
        </div>

        {/* Actionable Data */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity projects={recentProjects} />
          </div>
          
          {/* Team Insights Card */}
          <div className="premium-card rounded-xl p-6 h-fit">
            <h3 className="text-base font-semibold mb-4">{t("teamSentimentOverview")}</h3>
            <div className="space-y-4">
              {mostStressedDept && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div>
                    <p className="text-sm font-bold">{mostStressedDept.departmentName}</p>
                    <p className="text-xs text-muted-foreground">{mostStressedDept.dominantEmotion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-red-500">{mostStressedDept.sentimentScore}</p>
                    <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">{t("stressLevel")}</p>
                  </div>
                </div>
              )}
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 tracking-widest">{t("aiInsights")}</p>
                <p className="text-sm text-balance leading-relaxed">
                  {mostStressedDept?.keyConcerns || "No se detectan preocupaciones críticas en este momento."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
