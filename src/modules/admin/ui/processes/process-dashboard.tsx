"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import { ProcessCard } from "./process-card"
import { Button } from "@/modules/shared/ui/button"
import { PROCESS_DEFINITIONS, PROCESS_CATEGORIES } from "@/modules/admin/domain/process-registry"
import type { ProcessDashboardItem } from "@/modules/admin/actions/processes"
import { triggerProcess, cancelProcessRun } from "@/modules/admin/actions/processes"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TriggerDialog } from "./trigger-dialog"
import type { ProcessDefinition } from "@/modules/admin/domain/process-registry"

interface ProcessDashboardProps {
  initialData: ProcessDashboardItem[]
}

export function ProcessDashboard({ initialData }: ProcessDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [triggeringSlug, setTriggeringSlug] = useState<string | null>(null)
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null)
  const [dialogProcess, setDialogProcess] = useState<ProcessDefinition | null>(null)

  const handleTrigger = useCallback((slug: string) => {
    const definition = PROCESS_DEFINITIONS.find((p) => p.slug === slug)
    if (!definition) return

    // Si tiene opciones, abrir dialog
    if (definition.options?.length) {
      setDialogProcess(definition)
      return
    }

    // Ejecutar directamente
    executeTrigger(slug)
  }, [])

  const executeTrigger = useCallback(async (slug: string, options?: Record<string, unknown>) => {
    const definition = PROCESS_DEFINITIONS.find((p) => p.slug === slug)
    setTriggeringSlug(slug)
    try {
      const result = await triggerProcess(slug, options)
      if (result.success) {
        if (definition?.executor === "n8n" || definition?.executor === "external") {
          toast.warning(`"${definition.name}" registrado`, {
            description: `El proceso queda pendiente de ejecución por ${definition.executor}. Si no hay workflow conectado, cancela el run desde aquí.`,
            duration: 8000,
          })
        } else {
          toast.success(`"${definition?.name ?? slug}" ejecutado`, {
            description: result.result?.message ? String(result.result.message) : undefined,
          })
        }
      } else {
        toast.error("Error al ejecutar proceso", { description: result.error })
      }
      startTransition(() => router.refresh())
    } finally {
      setTriggeringSlug(null)
    }
  }, [router])

  const handleDialogConfirm = useCallback((options: Record<string, unknown>) => {
    if (!dialogProcess) return
    setDialogProcess(null)
    executeTrigger(dialogProcess.slug, options)
  }, [dialogProcess, executeTrigger])

  const handleCancel = useCallback(async (runId: string) => {
    setCancellingRunId(runId)
    try {
      const result = await cancelProcessRun(runId)
      if (result.success) {
        toast.success("Run cancelado")
      } else {
        toast.error("Error al cancelar", { description: result.error })
      }
      startTransition(() => router.refresh())
    } finally {
      setCancellingRunId(null)
    }
  }, [router])

  // Polling automático mientras haya procesos en ejecución
  const hasRunning = initialData.some((d) => d.runningNow)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (hasRunning) {
      intervalRef.current = setInterval(() => {
        startTransition(() => router.refresh())
      }, 5000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [hasRunning, router])

  // Agrupar procesos por categoría
  const grouped = Object.entries(PROCESS_CATEGORIES).map(([key, meta]) => ({
    key,
    ...meta,
    processes: PROCESS_DEFINITIONS.filter((p) => p.category === key),
  })).filter((g) => g.processes.length > 0)

  const dataMap = new Map(initialData.map((d) => [d.slug, d]))

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => startTransition(() => router.refresh())}
          disabled={isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {grouped.map((group) => (
        <div key={group.key} className="mb-6">
          <h3 className={`text-sm font-semibold mb-3 ${group.color}`}>
            {group.label}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.processes.map((proc) => (
              <ProcessCard
                key={proc.slug}
                definition={proc}
                dashboardItem={
                  dataMap.get(proc.slug) ?? {
                    slug: proc.slug,
                    lastRun: null,
                    runningNow: false,
                    activeRunId: null,
                  }
                }
                onTrigger={handleTrigger}
                onCancel={handleCancel}
                isTriggering={triggeringSlug === proc.slug}
                isCancelling={cancellingRunId === (dataMap.get(proc.slug)?.activeRunId ?? null)}
              />
            ))}
          </div>
        </div>
      ))}

      {dialogProcess && (
        <TriggerDialog
          process={dialogProcess}
          open={!!dialogProcess}
          onOpenChange={(open) => !open && setDialogProcess(null)}
          onConfirm={handleDialogConfirm}
        />
      )}
    </>
  )
}
