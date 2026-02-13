import { Header } from "@/components/layout/header"
import { SentimentChart } from "@/modules/sentiment/ui/sentiment-chart"
import { EmotionCards } from "@/modules/sentiment/ui/emotion-cards"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/modules/shared/ui/card"
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { cn } from "@/lib/utils"
import { Button } from "@/modules/shared/ui/button"
import { Link } from "@/i18n/navigation"
import { getDepartments } from "@/modules/sentiment/actions/sentiment"
import { NewCheckInButton } from "@/modules/sentiment/ui/new-check-in-button"
import { hasPermission } from "@/lib/actions/rbac"

async function getSentimentData() {
  // 1. Get all moods ordered by detection time
  const allMoods = await prisma.teamMood.findMany({
    orderBy: { detectedAt: 'desc' },
  })

  if (allMoods.length === 0) {
    return { moods: [], avgScore: 0, criticalDepts: 0, healthyDepts: 0, trend: null }
  }

  // 2. Identify the "Latest" set (the most recent detection window)
  const latestDetect = allMoods[0].detectedAt
  // We consider moods detected within 2 seconds of the latest one as part of the same "report"
  const currentMoods = allMoods.filter(m => 
    Math.abs(m.detectedAt.getTime() - latestDetect.getTime()) < 2000
  )

  // 3. Identify the "Previous" set
  const previousReportMoods = allMoods.filter(m => 
    m.detectedAt.getTime() < latestDetect.getTime() - 2000
  )
  
  const previousDetect = previousReportMoods.length > 0 ? previousReportMoods[0].detectedAt : null
  const previousMoods = previousDetect ? previousReportMoods.filter(m => 
    Math.abs(m.detectedAt.getTime() - previousDetect.getTime()) < 2000
  ) : []

  // 4. Calculate Current Stats
  const avgScore = Math.round(
    currentMoods.reduce((sum, m) => sum + m.sentimentScore, 0) / currentMoods.length
  )
  const criticalDepts = currentMoods.filter(m => m.sentimentScore < 50).length
  const stableDepts = currentMoods.filter(m => m.sentimentScore >= 50 && m.sentimentScore < 75).length
  const healthyDepts = currentMoods.filter(m => m.sentimentScore >= 75).length

  // 5. Calculate Trend
  let trend = null
  if (previousMoods.length > 0) {
    const prevAvg = Math.round(
      previousMoods.reduce((sum, m) => sum + m.sentimentScore, 0) / previousMoods.length
    )
    trend = Number(((avgScore - prevAvg) / (prevAvg || 1)) * 100).toFixed(1)
  }

  return { 
    moods: currentMoods, 
    avgScore, 
    criticalDepts, 
    stableDepts, 
    healthyDepts, 
    trend: trend ? parseFloat(trend) : null 
  }
}

export default async function SentimentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sentiment")
  
  // Use new RBAC check
  const canManage = await hasPermission('sentiment', 'create')
  
  const [{ moods, avgScore, criticalDepts, stableDepts, healthyDepts, trend }, departments] = await Promise.all([
    getSentimentData(),
    getDepartments()
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        titleKey="sentiment.title"
        descriptionKey="sentiment.description"
      >
        {canManage && (
            <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="hidden md:flex">
                    {/* Link to history - strictly internal sentiment path now */}
                    <Link href="/sentiment/history">
                        Gestión (Admin)
                    </Link>
                </Button>
                <NewCheckInButton departments={departments} />
            </div>
        )}
      </Header>
      
      <div className="flex-1 p-4 md:p-6 space-y-4 w-full max-w-[1600px] mx-auto">
        {/* Bento Grid Compacto - Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
          
          {/* Main Score - Hero Card (Span 2) */}
          <Card className="premium-card rounded-2xl md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-none overflow-hidden group min-h-[140px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-40 transition-opacity group-hover:opacity-60" />
            
            <CardContent className="p-5 flex items-center gap-6 h-full relative z-10">
              {/* Circular Progress Gauge */}
              <div className="relative shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-slate-700/50"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#gradient-bento)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(avgScore / 100) * 251.2} 251.2`}
                    className="drop-shadow-[0_0_8px_rgba(234,179,8,0.3)] transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient-bento" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#eab308" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{avgScore}</span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                  {t("companyAverage")}
                </p>
                <h2 className="text-white text-xl md:text-2xl font-black tracking-tight mb-2 leading-none">
                  {t("pulseTitle")}
                </h2>
                {trend !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "flex items-center gap-1 font-bold",
                      trend >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{trend > 0 ? `+${trend}` : trend}%</span>
                    </div>
                    <span className="text-slate-500 text-[11px] font-medium">{t("vsLastMonth")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Critical Stats - Red Card */}
          <Card className="premium-card rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 py-0 group hover:bg-red-500/[0.12] transition-colors">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-[10px] text-red-500/70 font-black uppercase tracking-widest leading-none">{t("criticalLabel")}</span>
              </div>
              <p className="text-5xl font-black text-red-500 leading-none tabular-nums tracking-tighter">{criticalDepts}</p>
              <p className="text-[11px] font-bold text-muted-foreground/40 mt-2 uppercase tracking-tight">{t("departments")}</p>
            </CardContent>
          </Card>

          {/* Stable Stats - Blue Card */}
          <Card className="premium-card rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 py-0 group hover:bg-blue-500/[0.12] transition-colors">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-[10px] text-blue-500/70 font-black uppercase tracking-widest leading-none">{t("stableLabel")}</span>
              </div>
              <p className="text-5xl font-black text-blue-500 leading-none tabular-nums tracking-tighter">{stableDepts}</p>
              <p className="text-[11px] font-bold text-muted-foreground/40 mt-2 uppercase tracking-tight">{t("departments")}</p>
            </CardContent>
          </Card>

          {/* Healthy Stats - Green Card */}
          <Card className="premium-card rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 py-0 group hover:bg-emerald-500/[0.12] transition-colors">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest leading-none">{t("healthyLabel")}</span>
              </div>
              <p className="text-5xl font-black text-emerald-500 leading-none tabular-nums tracking-tighter">{healthyDepts}</p>
              <p className="text-[11px] font-bold text-muted-foreground/40 mt-2 uppercase tracking-tight">{t("departments")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section - Expanded */}
        <div className="w-full pt-0">
          <SentimentChart moods={moods} />
        </div>

        {/* Detailed Insights Section Header */}
        <div className="w-full pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
              {t("departmentInsights")}
            </h2>
            <div className="hidden sm:block h-px flex-1 mx-8 bg-gradient-to-r from-border/50 to-transparent" />
          </div>
          <EmotionCards moods={moods} />
        </div>
      </div>
    </div>
  )
}
