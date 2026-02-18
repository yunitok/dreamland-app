import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getQueries, getQueryCategories } from "@/modules/atc/actions/queries"
import { QueriesTable } from "@/modules/atc/ui/queries/queries-table"

export default async function AtcQueriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const [queriesResult, categoriesResult] = await Promise.all([
    getQueries(),
    getQueryCategories(),
  ])

  if (!queriesResult.success) {
    return <div className="p-8">{t("errorLoading")}</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("queriesTitle")}
        description={t("queriesDescription")}
        backHref="/atc"
      />

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <QueriesTable
            data={queriesResult.data ?? []}
            categories={categoriesResult.data ?? []}
          />
        </Suspense>
      </div>
    </div>
  )
}
