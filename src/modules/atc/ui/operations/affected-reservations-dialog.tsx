"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/ui/dialog"
import { getAffectedReservations } from "@/modules/atc/actions/operations"
import { useTranslations } from "next-intl"

interface AffectedReservationsDialogProps {
  forecastDate: Date
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ReservationRow = {
  id: string
  guestName: string
  guestPhone: string | null
  time: string
  partySize: number
  status: string
  notes: string | null
  channel: { name: string } | null
}

export function AffectedReservationsDialog({
  forecastDate,
  open,
  onOpenChange,
}: AffectedReservationsDialogProps) {
  const t = useTranslations("atc")
  const [reservations, setReservations] = useState<ReservationRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      getAffectedReservations(new Date(forecastDate))
        .then((result) => {
          if (result.success && result.data) {
            setReservations(result.data as ReservationRow[])
          }
        })
        .finally(() => setLoading(false))
    }
  }, [open, forecastDate])

  const dateStr = new Date(forecastDate).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("affectedReservations")}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {reservations.length} reservas para el {dateStr}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("noAffectedReservations")}
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-medium">{t("name")}</th>
                  <th className="pb-2 font-medium">Hora</th>
                  <th className="pb-2 font-medium">{t("partySize")}</th>
                  <th className="pb-2 font-medium">{t("status")}</th>
                  <th className="pb-2 font-medium">{t("channel")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium">{r.guestName}</td>
                    <td className="py-2">{r.time}</td>
                    <td className="py-2 text-center">{r.partySize}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{r.channel?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
