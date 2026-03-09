"use client"

import { Link } from "@/i18n/navigation"
import { Card, CardContent } from "@/modules/shared/ui/card"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  OctagonAlert,
  CircleAlert,
  ArrowRight,
} from "lucide-react"
import type { UnreadByCategoryItem } from "@/modules/atc/actions/atc-analytics"

interface Props {
  data: UnreadByCategoryItem[]
  isPending: boolean
}

type Status = "green" | "amber" | "red"

function getStatus(totalUrgent: number, totalHigh: number): Status {
  if (totalUrgent > 0) return "red"
  if (totalHigh > 0) return "amber"
  return "green"
}

const statusConfig = {
  green: {
    icon: CheckCircle2,
    title: "Todo bajo control",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-700 dark:text-emerald-400",
  },
  amber: {
    icon: CircleAlert,
    title: "Revisar cuando podáis",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    iconColor: "text-amber-500",
    titleColor: "text-amber-700 dark:text-amber-400",
  },
  red: {
    icon: OctagonAlert,
    title: "Atención necesaria",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    iconColor: "text-red-500",
    titleColor: "text-red-700 dark:text-red-400",
  },
} as const

export function UnreadByCategoryPanel({ data, isPending }: Props) {
  const totalUnread = data.reduce((sum, d) => sum + d.unreadCount, 0)
  const totalUrgent = data.reduce((sum, d) => sum + d.urgentCount, 0)
  const totalHigh = data.reduce((sum, d) => sum + d.highCount, 0)

  if (isPending && data.length === 0) {
    return <Skeleton className="h-32 rounded-xl" />
  }

  // Sin emails pendientes
  if (data.length === 0) {
    return <GreenState totalUnread={0} />
  }

  const status = getStatus(totalUrgent, totalHigh)

  // Estado verde: nada urgente ni alta
  if (status === "green") {
    return <GreenState totalUnread={totalUnread} />
  }

  // Estado ámbar/rojo: layout de 2 columnas
  const exceptions = data.filter((d) => d.urgentCount > 0 || d.highCount > 0)
  const normalCount = data.length - exceptions.length
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Card className={cn(config.border, config.bg)}>
      <CardContent className="py-5 px-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Izquierda: estado + números clave */}
          <div className="lg:w-56 shrink-0">
            <div className="flex items-center gap-2.5 mb-3">
              <Icon className={cn("h-6 w-6", config.iconColor)} />
              <p className={cn("font-semibold text-base", config.titleColor)}>
                {config.title}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold tabular-nums leading-none">
                {totalUnread}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                  sin leer
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {totalUrgent > 0 && (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                    {totalUrgent} urgente{totalUrgent > 1 ? "s" : ""}
                  </span>
                )}
                {totalHigh > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {totalHigh} prioridad alta
                  </span>
                )}
              </div>

              {normalCount > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  + {normalCount} categoría{normalCount > 1 ? "s" : ""} sin urgencias
                </p>
              )}
            </div>
          </div>

          {/* Separador vertical */}
          <div className="hidden lg:block w-px bg-border/60" />
          {/* Separador horizontal en móvil */}
          <div className="lg:hidden h-px bg-border/60" />

          {/* Derecha: excepciones en grid compacto */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Categorías que necesitan atención
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {exceptions.map((item) => (
                <ExceptionRow key={item.categoryId ?? "__null__"} item={item} />
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-border/40">
              <Link
                href="/atc/backoffice"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver todo en backoffice
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Sub-components ─────────────────────────────────────────

function GreenState({ totalUnread }: { totalUnread: number }) {
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="py-5 px-5">
        <div className="flex items-center gap-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-lg text-emerald-700 dark:text-emerald-400">
              Todo bajo control
            </p>
            <p className="text-sm text-muted-foreground">
              {totalUnread > 0
                ? `${totalUnread} sin leer, pero nada urgente. Podéis dedicaros a otras tareas.`
                : "No hay emails pendientes de lectura. Podéis dedicaros a otras tareas."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ExceptionRow({ item }: { item: UnreadByCategoryItem }) {
  const href = item.slug
    ? `/atc/backoffice?category=${item.slug}`
    : "/atc/backoffice"

  return (
    <Link href={href}>
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-background/60 transition-colors cursor-pointer group">
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-sm truncate min-w-0 flex-1">
          {item.categoryName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.urgentCount > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {item.urgentCount} urg.
            </span>
          )}
          {item.highCount > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {item.highCount} alta
            </span>
          )}
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </Link>
  )
}
