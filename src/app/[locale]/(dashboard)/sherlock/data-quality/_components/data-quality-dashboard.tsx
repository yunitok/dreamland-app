"use client"

import { useState, useTransition } from "react"
import { Play, Loader2, Clock, Database, AlertTriangle, Info, XCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { runFullDataQualityAudit } from "@/modules/sherlock/actions/data-quality"
import type { FullAuditReport } from "@/modules/sherlock/domain/data-quality/types"
import { EndpointCard } from "./endpoint-card"
import { HealthScoreRing } from "./health-score-ring"

export function DataQualityDashboard() {
  const [report, setReport] = useState<FullAuditReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRunAudit = () => {
    setError(null)
    startTransition(async () => {
      const result = await runFullDataQualityAudit()
      if (result.success && result.data) {
        setReport(result.data)
      } else {
        setError(result.error ?? "Error desconocido")
      }
    })
  }

  const sortedEndpoints = report
    ? [...report.endpoints].sort((a, b) => a.summary.healthScore - b.summary.healthScore)
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera con botón de ejecución */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Auditoría de Normalización GStock</h2>
          <p className="text-sm text-muted-foreground">
            Analiza los datos del API de GStock para detectar inconsistencias en la normalización de campos de texto.
          </p>
        </div>
        <Button onClick={handleRunAudit} disabled={isPending} className="gap-2 shrink-0">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Ejecutar Auditoría
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Estado vacío inicial */}
      {!report && !isPending && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <ShieldCheck className="h-12 w-12 opacity-30" />
            <p className="text-sm">Pulsa "Ejecutar Auditoría" para analizar los datos de GStock</p>
            <p className="text-xs">Se auditarán {12} endpoints con los campos que mapean a modelos de Sherlock</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Conectando con GStock y analizando datos...</p>
            <p className="text-xs">Esto puede tardar entre 5 y 15 segundos</p>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {report && !isPending && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Health Score"
              value={
                <HealthScoreRing score={report.globalSummary.overallHealthScore} size={48} />
              }
              description={`${report.globalSummary.successfulEndpoints}/${report.globalSummary.totalEndpoints} endpoints OK`}
            />
            <SummaryCard
              title="Issues Críticas"
              value={
                <span className={`text-2xl font-bold ${report.globalSummary.criticalCount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                  {report.globalSummary.criticalCount}
                </span>
              }
              description="Duplicados potenciales"
              icon={<XCircle className="h-4 w-4 text-red-400" />}
            />
            <SummaryCard
              title="Warnings"
              value={
                <span className={`text-2xl font-bold ${report.globalSummary.warningCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {report.globalSummary.warningCount}
                </span>
              }
              description="Case, espacios, tildes"
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
            />
            <SummaryCard
              title="Tiempo"
              value={
                <span className="text-2xl font-bold text-foreground">
                  {(report.durationMs / 1000).toFixed(1)}s
                </span>
              }
              description={`${report.globalSummary.totalRecords} registros auditados`}
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Info bar */}
          <p className="text-xs text-muted-foreground">
            Auditoría ejecutada el {new Date(report.timestamp).toLocaleString("es-ES")} · Ordenado por health score (peor primero)
          </p>

          {/* Endpoint cards */}
          <div className="flex flex-col gap-3">
            {sortedEndpoints.map((result) => (
              <EndpointCard key={result.endpoint} result={result} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: React.ReactNode
  description: string
  icon?: React.ReactNode
}

function SummaryCard({ title, value, description, icon }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardDescription className="flex items-center gap-1.5">
          {icon}
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 px-4">
        <div className="flex items-center gap-2 mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
