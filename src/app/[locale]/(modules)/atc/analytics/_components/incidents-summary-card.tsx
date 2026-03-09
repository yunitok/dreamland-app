"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { ShieldAlert, CheckCircle2 } from "lucide-react"
import type { IncidentSummaryItem } from "@/modules/atc/actions/atc-analytics"

const severityConfig: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: "Crítica", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  HIGH: { label: "Alta", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  MEDIUM: { label: "Media", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  LOW: { label: "Baja", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
}

interface Props {
  data: IncidentSummaryItem[]
  isPending: boolean
}

export function IncidentsSummaryCard({ data, isPending }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const hasCritical = data.some((d) => d.severity === "CRITICAL" && d.count > 0)

  if (isPending && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incidencias abiertas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={hasCritical ? "border-red-500/20" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className={`h-4 w-4 ${hasCritical ? "text-red-500" : "text-muted-foreground"}`} />
          Incidencias abiertas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Sin incidencias abiertas</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
              const item = data.find((d) => d.severity === sev)
              if (!item || item.count === 0) return null
              const config = severityConfig[sev]
              return (
                <Badge key={sev} variant="outline" className={config.className}>
                  {config.label}: {item.count}
                </Badge>
              )
            })}
            <span className="text-sm text-muted-foreground self-center ml-1">
              ({total} total)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
