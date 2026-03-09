import { Header } from "@/components/layout/header"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { AtcAnalyticsDashboard } from "./_components/atc-analytics-dashboard"

export default async function AtcAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("analyticsTitle")}
        description={t("analyticsDescription")}
        backHref="/atc"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <AtcAnalyticsDashboard />
      </div>
    </div>
  )
}
