"use client"

import { useEffect, useState } from "react"
import { Card } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { RefreshCw } from "lucide-react"
import { getLastSyncInfo } from "@/modules/gastrolab/actions/cover-analytics"
import { cn } from "@/lib/utils"

export function SyncStatusCard() {
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
    <Card className="p-4 shrink-0">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Última sync:</span>
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", statusColor)}
            >
              {sync.status}
            </Badge>
          </div>
          <p className="text-muted-foreground tabular-nums">
            {new Date(sync.startedAt).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            {sync.snapshotsCreated + sync.snapshotsUpdated} snapshots
          </p>
        </div>
      </div>
    </Card>
  )
}
