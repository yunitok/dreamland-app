import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getReservations, getReservationChannels } from "@/modules/atc/actions/reservations"
import { ReservationsTable } from "@/modules/atc/ui/reservations/reservations-table"
import { ReservationDialog } from "@/modules/atc/ui/reservations/reservation-dialog"

export default async function AtcReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const [reservationsResult, channelsResult] = await Promise.all([
    getReservations(),
    getReservationChannels(),
  ])

  if (!reservationsResult.success) {
    return <div className="p-8">{t("errorLoading")}</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("reservationsTitle")}
        description={t("reservationsDescription")}
        backHref="/atc"
      >
        <ReservationDialog
          channels={channelsResult.data ?? []}
          trigger={t("addReservation")}
        />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <ReservationsTable
            data={reservationsResult.data ?? []}
            channels={channelsResult.data ?? []}
          />
        </Suspense>
      </div>
    </div>
  )
}
