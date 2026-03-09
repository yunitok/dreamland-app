"use client"

import { KPICard } from "@/components/dashboard/kpi-card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { Mail, AlertCircle, UserX, FileEdit, Clock, Inbox } from "lucide-react"
import type { EmailKpis } from "@/modules/atc/actions/atc-analytics"

interface Props {
  data: EmailKpis | null
  isPending: boolean
}

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function EmailKpiCards({ data, isPending }: Props) {
  if (isPending && !data) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const cards = [
    {
      title: "Sin leer",
      value: data.totalUnread,
      icon: Mail,
      variant: data.totalUnread > 20 ? "critical" as const : data.totalUnread > 10 ? "warning" as const : "default" as const,
      description: "Emails que nadie ha abierto aún",
    },
    {
      title: "Pendientes de respuesta",
      value: data.actionRequiredPending,
      icon: AlertCircle,
      variant: data.actionRequiredPending > 5 ? "critical" as const : data.actionRequiredPending > 0 ? "warning" as const : "success" as const,
      description: data.actionRequiredPending === 0
        ? "No hay emails esperando respuesta"
        : "Emails sin leer que necesitan contestar (quejas, reservas, consultas...)",
    },
    {
      title: "Sin asignar",
      value: data.unassigned,
      icon: UserX,
      variant: data.unassigned > 10 ? "warning" as const : "default" as const,
      description: "Nadie se ha hecho cargo de estos emails",
    },
    {
      title: "Borradores IA",
      value: data.pendingDrafts,
      icon: FileEdit,
      variant: "default" as const,
      description: "Respuestas preparadas por IA para revisar y enviar",
    },
    {
      title: "Tiempo respuesta",
      value: formatResponseTime(data.avgResponseTimeMinutes),
      icon: Clock,
      variant: (data.avgResponseTimeMinutes ?? 0) > 120 ? "warning" as const : "default" as const,
      description: "Lo que tardamos de media en contestar",
    },
    {
      title: "Recibidos hoy",
      value: data.totalToday,
      icon: Inbox,
      variant: "default" as const,
      description: "Emails que han llegado hoy",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  )
}
