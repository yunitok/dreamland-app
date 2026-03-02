"use client"

import { useState } from "react"
import { Badge } from "@/modules/shared/ui/badge"
import {
  CheckCircle2, XCircle, Loader2, AlertTriangle, Clock,
  User, Bot, Webhook, ChevronDown,
} from "lucide-react"
import type { ProcessHistoryRun } from "@/modules/admin/actions/processes"

// ─── Tipos ────────────────────────────────────────────────────

interface PhaseData {
  phase?: string
  name?: string
  model?: string
  endpoint?: string
  created?: number
  updated?: number
  skipped?: number
  errors?: string[]
  durationMs?: number
  status?: string
}

// ─── Constantes ───────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  "measure-units": "Unidades de medida",
  "categories": "Categorías",
  "recipe-categories": "Cat. recetas",
  "recipe-families": "Familias recetas",
  "suppliers": "Proveedores",
  "ingredients": "Ingredientes",
  "recipes": "Recetas",
  "knowledge-base": "Knowledge Base",
}

// ─── Helpers ──────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
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

function TriggerBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" }> = {
    MANUAL: { label: "Manual", icon: User, variant: "secondary" },
    CRON: { label: "Cron", icon: Clock, variant: "outline" },
    WEBHOOK: { label: "Webhook", icon: Webhook, variant: "outline" },
    SYSTEM: { label: "Sistema", icon: Bot, variant: "outline" },
  }
  const c = config[type] ?? config.MANUAL
  const Icon = c.icon
  return (
    <Badge variant={c.variant} className="text-[10px] gap-1 font-normal">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function formatDuration(ms: number | null | undefined): string {
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
  const parts: string[] = []
  for (const [key, val] of Object.entries(output)) {
    if (key === "message") {
      parts.push(String(val))
    } else if (typeof val === "number") {
      parts.push(`${key}: ${val}`)
    }
  }
  return parts.slice(0, 4).join(" | ") || null
}

function getPhaseLabel(phase: PhaseData): string {
  const key = phase.phase ?? phase.name ?? ""
  return PHASE_LABELS[key] ?? phase.model ?? (key || "Fase")
}

function getPhases(run: ProcessHistoryRun): PhaseData[] {
  if (!run.phases || !Array.isArray(run.phases) || run.phases.length === 0) return []
  return run.phases as PhaseData[]
}

function hasPhaseErrors(phase: PhaseData): boolean {
  return Array.isArray(phase.errors) && phase.errors.length > 0
}

// ─── Componente: tabla de fases ──────────────────────────────

function PhaseTable({ phases }: { phases: PhaseData[] }) {
  return (
    <div className="mt-3 rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="text-left font-medium px-3 py-1.5">Fase</th>
            <th className="text-right font-medium px-2 py-1.5 w-16">Creados</th>
            <th className="text-right font-medium px-2 py-1.5 w-16">Actual.</th>
            <th className="text-right font-medium px-2 py-1.5 w-14">Err.</th>
            <th className="text-right font-medium px-3 py-1.5 w-16">Durac.</th>
          </tr>
        </thead>
        <tbody>
          {phases.map((phase, i) => {
            const hasErrors = hasPhaseErrors(phase)
            return (
              <tr
                key={i}
                className={`border-t ${hasErrors ? "bg-destructive/5" : ""}`}
              >
                <td className={`px-3 py-1.5 ${hasErrors ? "text-destructive font-medium" : ""}`}>
                  {getPhaseLabel(phase)}
                </td>
                <td className="text-right px-2 py-1.5 tabular-nums">
                  {phase.created ?? "-"}
                </td>
                <td className="text-right px-2 py-1.5 tabular-nums">
                  {phase.updated ?? "-"}
                </td>
                <td className={`text-right px-2 py-1.5 tabular-nums ${hasErrors ? "text-destructive font-medium" : ""}`}>
                  {phase.errors?.length ?? 0}
                </td>
                <td className="text-right px-3 py-1.5 text-muted-foreground">
                  {formatDuration(phase.durationMs)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Componente: errores por fase ────────────────────────────

function PhaseErrors({ phases }: { phases: PhaseData[] }) {
  const phasesWithErrors = phases.filter(hasPhaseErrors)
  if (phasesWithErrors.length === 0) return null

  return (
    <div className="mt-2 space-y-1.5">
      {phasesWithErrors.map((phase, i) => (
        <div key={i} className="text-xs">
          <span className="font-medium text-destructive">
            Errores en &quot;{getPhaseLabel(phase)}&quot;:
          </span>
          <ul className="mt-0.5 ml-4 list-disc text-destructive/80">
            {phase.errors!.map((err, j) => (
              <li key={j} className="line-clamp-2">{err}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── Componente: badges de fases (colapsado) ─────────────────

function PhaseBadges({ phases }: { phases: PhaseData[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {phases.map((phase, i) => {
        const hasErrors = hasPhaseErrors(phase)
        const isOk = !hasErrors && (phase.status === "OK" || phase.status === "SUCCESS" || !phase.status)
        return (
          <Badge
            key={i}
            variant="outline"
            className={`text-[10px] ${
              isOk
                ? "text-emerald-600 border-emerald-200"
                : "text-destructive border-destructive/30"
            }`}
          >
            {getPhaseLabel(phase)}
          </Badge>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

interface ProcessRunTimelineProps {
  runs: ProcessHistoryRun[]
}

export function ProcessRunTimeline({ runs }: ProcessRunTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleExpand(runId: string) {
    setExpandedId((prev) => (prev === runId ? null : runId))
  }

  return (
    <div className="space-y-0">
      {runs.map((run, i) => {
        const phases = getPhases(run)
        const hasPhases = phases.length > 0
        const isExpanded = expandedId === run.id
        const isExpandable = hasPhases && run.status !== "RUNNING" && run.status !== "PENDING"

        return (
          <div
            key={run.id}
            className={`py-3 ${i < runs.length - 1 ? "border-b" : ""}`}
          >
            {/* Fila principal */}
            <div
              className={`flex items-start gap-3 ${isExpandable ? "cursor-pointer" : ""}`}
              onClick={isExpandable ? () => toggleExpand(run.id) : undefined}
              role={isExpandable ? "button" : undefined}
              tabIndex={isExpandable ? 0 : undefined}
              onKeyDown={isExpandable ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleExpand(run.id)
                }
              } : undefined}
            >
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                <StatusIcon status={run.status} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{formatDate(run.startedAt)}</span>
                  <TriggerBadge type={run.triggerType} />
                  {run.durationMs != null && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(run.durationMs)}
                    </span>
                  )}
                </div>

                {/* Output summary */}
                {run.status === "SUCCESS" && run.output && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formatOutputSummary(run.output)}
                  </p>
                )}

                {/* Error */}
                {run.status === "FAILED" && run.error && (
                  <p className="text-xs text-destructive mt-0.5 line-clamp-2">
                    {run.error}
                  </p>
                )}

                {/* Phases badges (siempre visibles si hay fases) */}
                {hasPhases && !isExpanded && <PhaseBadges phases={phases} />}
              </div>

              {/* Chevron de expansión */}
              {isExpandable && (
                <div className="mt-0.5 shrink-0">
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Contenido expandido */}
            {isExpanded && hasPhases && (
              <div className="ml-7">
                <PhaseTable phases={phases} />
                <PhaseErrors phases={phases} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
