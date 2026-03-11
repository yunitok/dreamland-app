import { fetchGstock } from "@/lib/gstock"
import { analyzeField, detectStringFields } from "./analyzers"
import { buildEndpointSummary } from "./report-builder"
import { AUDITABLE_ENDPOINTS, type AuditableEndpoint } from "./endpoint-config"
import type { FieldAnalysis, EndpointAuditResult } from "./types"

// ─── Tipos propios del audit-core ────────────────────────────────────────────

export interface FieldSummary {
  totalFields: number
  fieldsWithIssues: number
  highestEmptyRate: number
}

export interface FullAuditReport {
  totalEndpoints: number
  auditedEndpoints: number
  failedEndpoints: number
  durationMs: number
  overallScore: number // 0-100
  endpoints: EndpointAuditResult[]
  errors: Array<{ endpoint: string; error: string }>
  message: string
}

// Re-exportar tipos del módulo para conveniencia del consumidor
export type { EndpointAuditResult, FieldAnalysis, AuditableEndpoint }

// ─── Constantes ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 4

// ─── Core: auditar un endpoint ───────────────────────────────────────────────

/** Audita un único endpoint de GStock sin RBAC. Apto para proceso desatendido. */
export async function auditEndpointCore(config: AuditableEndpoint): Promise<EndpointAuditResult> {
  const fetchStart = Date.now()

  const response = await fetchGstock<Record<string, unknown>>(config.path)
  const records = Array.isArray(response.data) ? response.data : []
  const fetchTimeMs = Date.now() - fetchStart

  const stringFields = detectStringFields(records)
  const fields: FieldAnalysis[] = stringFields.map((fieldName) =>
    analyzeField(records, fieldName, config.idField)
  )
  const summary = buildEndpointSummary(fields, records.length)

  return {
    endpoint: config.path,
    label: config.label,
    gastrolabMapping: config.gastrolabMapping,
    recordCount: records.length,
    fetchTimeMs,
    fields,
    summary,
  }
}

// ─── Cálculo de puntuación global ────────────────────────────────────────────

/** Calcula la puntuación global (0-100) a partir de los resultados de cada endpoint */
function calculateOverallScore(endpoints: EndpointAuditResult[]): number {
  if (endpoints.length === 0) return 0

  const totalScore = endpoints.reduce((sum, ep) => sum + ep.summary.healthScore, 0)
  return Math.max(0, Math.round(totalScore / endpoints.length))
}

/** Genera el mensaje resumen legible del informe */
function buildReportMessage(audited: number, failed: number, score: number): string {
  if (audited === 0) return "No se pudo auditar ningún endpoint."

  const quality =
    score >= 90 ? "excelente" :
    score >= 70 ? "buena" :
    score >= 50 ? "aceptable" :
    "deficiente"

  const failedMsg = failed > 0 ? ` ${failed} endpoint(s) fallaron.` : ""
  return `Auditoría completada: ${audited} endpoints auditados con calidad ${quality} (${score}/100).${failedMsg}`
}

// ─── Core: auditoría completa en lotes paralelos ─────────────────────────────

/** Ejecuta la auditoría completa de todos los endpoints en lotes paralelos de 4. Sin RBAC. */
export async function runFullAuditCore(): Promise<FullAuditReport> {
  const startTime = Date.now()
  const endpoints = AUDITABLE_ENDPOINTS
  const auditedEndpoints: EndpointAuditResult[] = []
  const errors: Array<{ endpoint: string; error: string }> = []

  for (let i = 0; i < endpoints.length; i += BATCH_SIZE) {
    const batch = endpoints.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map((ep) => auditEndpointCore(ep)))

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const config = batch[j]

      if (result.status === "fulfilled") {
        auditedEndpoints.push(result.value)
      } else {
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        errors.push({ endpoint: config.path, error: errorMsg })
      }
    }
  }

  const durationMs = Date.now() - startTime
  const overallScore = calculateOverallScore(auditedEndpoints)

  return {
    totalEndpoints: endpoints.length,
    auditedEndpoints: auditedEndpoints.length,
    failedEndpoints: errors.length,
    durationMs,
    overallScore,
    endpoints: auditedEndpoints,
    errors,
    message: buildReportMessage(auditedEndpoints.length, errors.length, overallScore),
  }
}
