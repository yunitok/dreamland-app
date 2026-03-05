"use client"

import { Card, CardHeader, CardTitle, CardDescription } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import {
  RefreshCw, BookOpen, Bell, Trash2, CloudRain, Play, Loader2,
  Clock, CheckCircle2, XCircle, AlertTriangle, Square,
} from "lucide-react"
import type { ProcessDefinition } from "@/modules/admin/domain/process-registry"
import type { ProcessDashboardItem } from "@/modules/admin/actions/processes"
import { PROCESS_CATEGORIES } from "@/modules/admin/domain/process-registry"
import { Link } from "@/i18n/navigation"

const ICON_MAP: Record<string, React.ElementType> = {
  RefreshCw, BookOpen, Bell, Trash2, CloudRain,
}

function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "FAILED":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "RUNNING":
    case "PENDING":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case "CANCELLED":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Ahora"
  if (mins < 60) return `Hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Ayer"
  return `Hace ${days}d`
}

function formatDuration(ms: number | null): string {
  if (!ms) return ""
  if (ms < 1000) return `${ms}ms`
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem ? `${mins}m ${rem}s` : `${mins}m`
}

function formatOutputSummary(output: Record<string, unknown> | null): string | null {
  if (!output) return null
  // Intentar extraer datos clave del output
  const parts: string[] = []
  if ("deleted" in output) parts.push(`${output.deleted} borrados`)
  if ("created" in output) parts.push(`${output.created} creados`)
  if ("recipesSync" in output) parts.push(`${output.recipesSync} recetas`)
  if ("kbEntries" in output) parts.push(`${output.kbEntries} KB entries`)
  if ("message" in output) parts.push(String(output.message))
  return parts.join(", ") || null
}

interface ProcessCardProps {
  definition: ProcessDefinition
  dashboardItem: ProcessDashboardItem
  onTrigger: (slug: string) => void
  onCancel: (runId: string) => void
  onForceFail: (runId: string) => void
  isTriggering: boolean
  isCancelling: boolean
  isForceFailing: boolean
}

export function ProcessCard({ definition, dashboardItem, onTrigger, onCancel, onForceFail, isTriggering, isCancelling, isForceFailing }: ProcessCardProps) {
  const Icon = ICON_MAP[definition.icon] ?? RefreshCw
  const category = PROCESS_CATEGORIES[definition.category]
  const { lastRun, runningNow, activeRunId } = dashboardItem
  const isRunning = runningNow || isTriggering

  const outputSummary = lastRun ? formatOutputSummary(lastRun.output) : null

  return (
    <Card className="group relative flex flex-col h-full hover:border-primary/30 transition-colors gap-0! py-0!">
      <Link
        href={`/admin/processes/${definition.slug}`}
        className="absolute inset-0 z-0"
        aria-label={`Ver detalle de ${definition.name}`}
      />
      <CardHeader className="pb-2 pt-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md bg-muted ${category.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium leading-tight">{definition.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5 line-clamp-2">
                {definition.description}
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {/* Estado del último run */}
          <div className="flex items-center gap-1.5 text-xs">
            <StatusIcon status={lastRun?.status ?? null} />
            <span className="text-muted-foreground">
              {lastRun
                ? `${formatTimeAgo(lastRun.startedAt)}${lastRun.durationMs ? ` (${formatDuration(lastRun.durationMs)})` : ""}`
                : "Sin ejecutar"}
            </span>
          </div>

          {/* Resumen del output */}
          {outputSummary && (
            <p className="text-xs text-muted-foreground line-clamp-2 pl-5.5">
              {outputSummary}
            </p>
          )}

          {/* Error */}
          {lastRun?.status === "FAILED" && lastRun.error && (
            <p className="text-xs text-destructive line-clamp-2 pl-5.5">
              {lastRun.error}
            </p>
          )}
        </div>
      </CardHeader>

      {/* Footer siempre visible: schedule + ejecutar/cancelar */}
      <div className="flex items-center justify-between px-6 pb-3 pt-1">
        {definition.schedule ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {definition.schedule}
          </Badge>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          {runningNow && activeRunId && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="relative z-10 h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault()
                  onForceFail(activeRunId)
                }}
                disabled={isForceFailing}
              >
                {isForceFailing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Forzar fallo
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="relative z-10 h-7 gap-1 text-xs text-muted-foreground hover:text-muted-foreground"
                onClick={(e) => {
                  e.preventDefault()
                  onCancel(activeRunId)
                }}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
                Cancelar
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="relative z-10 h-7 gap-1 text-xs"
            onClick={(e) => {
              e.preventDefault()
              onTrigger(definition.slug)
            }}
            disabled={isRunning || definition.executor === "external"}
          >
            {isTriggering ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Ejecutar
          </Button>
        </div>
      </div>
    </Card>
  )
}
