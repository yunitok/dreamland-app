import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getIncidents } from "@/modules/atc/actions/operations"
import { IncidentsTable } from "@/modules/atc/ui/operations/incidents-table"
import { IncidentDialog } from "@/modules/atc/ui/operations/incident-dialog"

export default async function AtcOperationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const incidentsResult = await getIncidents()

  if (!incidentsResult.success) {
    return <div className="p-8">{t("errorLoading")}</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("operationsTitle")}
        description={t("operationsDescription")}
        backHref="/atc"
      >
        <IncidentDialog trigger={t("addIncident")} />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <IncidentsTable data={incidentsResult.data ?? []} />
        </Suspense>
      </div>
    </div>
  )
}
