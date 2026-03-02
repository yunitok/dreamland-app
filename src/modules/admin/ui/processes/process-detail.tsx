"use client"

import { useState, useTransition, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import {
  RefreshCw, BookOpen, Bell, Trash2, CloudRain, Play, Loader2,
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle, Timer,
} from "lucide-react"
import type { ProcessDefinition } from "@/modules/admin/domain/process-registry"
import { PROCESS_CATEGORIES } from "@/modules/admin/domain/process-registry"
import type { ProcessHistoryRun } from "@/modules/admin/actions/processes"
import { triggerProcess } from "@/modules/admin/actions/processes"
import { Link } from "@/i18n/navigation"
import { useRouter } from "next/navigation"
import { TriggerDialog } from "./trigger-dialog"
import { ProcessRunTimeline } from "./process-run-timeline"

const ICON_MAP: Record<string, React.ElementType> = {
  RefreshCw, BookOpen, Bell, Trash2, CloudRain,
}

interface ProcessDetailProps {
  definition: ProcessDefinition
  runs: ProcessHistoryRun[]
  total: number
}

export function ProcessDetail({ definition, runs, total }: ProcessDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isTriggering, setIsTriggering] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const Icon = ICON_MAP[definition.icon] ?? RefreshCw
  const category = PROCESS_CATEGORIES[definition.category]

  const handleTrigger = useCallback(() => {
    if (definition.options?.length) {
      setDialogOpen(true)
      return
    }
    executeTrigger()
  }, [definition])

  const executeTrigger = useCallback(async (options?: Record<string, unknown>) => {
    setIsTriggering(true)
    try {
      await triggerProcess(definition.slug, options)
      startTransition(() => router.refresh())
    } finally {
      setIsTriggering(false)
    }
  }, [definition.slug, router])

  const handleDialogConfirm = useCallback((options: Record<string, unknown>) => {
    setDialogOpen(false)
    executeTrigger(options)
  }, [executeTrigger])

  const lastRun = runs[0] ?? null
  const successCount = runs.filter((r) => r.status === "SUCCESS").length
  const failCount = runs.filter((r) => r.status === "FAILED").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/admin/processes">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md bg-muted ${category.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{definition.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-9">
              {definition.description}
            </p>
          </div>
        </div>
        <Button
          onClick={handleTrigger}
          disabled={isTriggering || definition.executor === "external"}
        >
          {isTriggering ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Ejecutar ahora
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              Motor
            </div>
            <p className="text-lg font-semibold mt-1 capitalize">{definition.executor}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Schedule
            </div>
            <p className="text-lg font-semibold mt-1">{definition.schedule ?? "Manual"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Exitosas
            </div>
            <p className="text-lg font-semibold mt-1 text-emerald-600">{successCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              Fallidas
            </div>
            <p className="text-lg font-semibold mt-1 text-destructive">{failCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de ejecuciones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Historial de ejecuciones
              <Badge variant="secondary" className="ml-2 text-xs">{total}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTransition(() => router.refresh())}
              disabled={isPending}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isPending ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {runs.length ? (
            <ProcessRunTimeline runs={runs} />
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Este proceso aún no se ha ejecutado
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <TriggerDialog
          process={definition}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={handleDialogConfirm}
        />
      )}
    </div>
  )
}
