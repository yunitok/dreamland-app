"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/modules/shared/ui/badge"
import { getLastSyncInfo } from "@/modules/analytics/actions/cover-analytics"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function SyncStatusInline() {
  const t = useTranslations("analytics.covers.filters")
  const [sync, setSync] = useState<{
    status: string
    startedAt: Date
    finishedAt: Date | null
    snapshotsCreated: number
    snapshotsUpdated: number
  } | null>(null)

  useEffect(() => {
    getLastSyncInfo().then(setSync)
  }, [])

  if (!sync) return null

  const statusColor =
    sync.status === "SUCCESS"
      ? "bg-emerald-100 text-emerald-700"
      : sync.status === "RUNNING"
        ? "bg-blue-100 text-blue-700"
        : "bg-red-100 text-red-700"

  return (
    <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap shrink-0">
      <span>{t("lastSync")}:</span>
      <Badge
        variant="secondary"
        className={cn("text-[10px] px-1.5 py-0", statusColor)}
      >
        {sync.status}
      </Badge>
      <span className="tabular-nums">
        {new Date(sync.startedAt).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span>·</span>
      <span className="tabular-nums">
        {sync.snapshotsCreated + sync.snapshotsUpdated} {t("snapshots")}
      </span>
    </div>
  )
}
