import { Header } from "@/components/layout/header"
import { SentimentChart } from "@/components/sentiment/sentiment-chart"
import { EmotionCards } from "@/components/sentiment/emotion-cards"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, TrendingDown } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

async function getSentimentData() {
  const moods = await prisma.teamMood.findMany({
    orderBy: { sentimentScore: "asc" },
  })

  const avgScore = Math.round(
    moods.reduce((sum, m) => sum + m.sentimentScore, 0) / moods.length
  )

  const criticalDepts = moods.filter(m => m.sentimentScore < 50).length
  const healthyDepts = moods.filter(m => m.sentimentScore >= 70).length

  return { moods, avgScore, criticalDepts, healthyDepts }
}

export default async function SentimentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sentiment")
  
  const { moods, avgScore, criticalDepts, healthyDepts } = await getSentimentData()

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="sentiment.title"
        descriptionKey="sentiment.description"
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("companyAverage")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgScore}/100</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("overallWellnessScore")}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-500/5 border-red-500/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("criticalDepartments")}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{criticalDepts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("requireImmediateAttention")}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-emerald-500/5 border-emerald-500/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("healthyDepartments")}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500">{healthyDepts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("scoreAbove70")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <SentimentChart moods={moods} />

        {/* Emotion Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t("departmentInsights")}
          </h2>
          <EmotionCards moods={moods} />
        </div>
      </div>
    </div>
  )
}
