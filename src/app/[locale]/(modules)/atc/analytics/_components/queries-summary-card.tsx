"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { MessageSquare, CheckCircle2 } from "lucide-react"
import type { QuerySummaryData } from "@/modules/atc/actions/atc-analytics"

interface Props {
  data: QuerySummaryData | null
  isPending: boolean
}

export function QueriesSummaryCard({ data, isPending }: Props) {
  if (isPending && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultas pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const pendingTotal = data.openCount + data.escalatedCount
  const totalResolved = data.aiResolved + data.humanResolved
  const aiPct = totalResolved > 0 ? Math.round((data.aiResolved / totalResolved) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Consultas pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingTotal === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Todas resueltas</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              {data.openCount > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Abiertas: {data.openCount}
                </Badge>
              )}
              {data.escalatedCount > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                  Escaladas: {data.escalatedCount}
                </Badge>
              )}
            </div>
            {totalResolved > 0 && (
              <p className="text-xs text-muted-foreground">
                Ratio resolución IA: {aiPct}% ({data.aiResolved} de {totalResolved})
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
