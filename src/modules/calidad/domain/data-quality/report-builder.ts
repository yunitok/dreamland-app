import type { EndpointAuditResult, FieldAnalysis, FullAuditReport } from "./types"

/**
 * Calcula el health score (0-100) de un endpoint basándose en sus issues.
 * - Cada issue crítica resta 5 puntos (hasta -50)
 * - Cada warning resta 2 puntos (hasta -30)
 * - Cada info resta 0.5 puntos (hasta -10)
 * Mínimo: 0
 */
export function calculateHealthScore(fields: FieldAnalysis[], recordCount: number): number {
  if (recordCount === 0) return 100

  let totalIssues = { critical: 0, warning: 0, info: 0 }
  for (const field of fields) {
    for (const issue of field.issues) {
      if (issue.severity === "critical") totalIssues.critical++
      else if (issue.severity === "warning") totalIssues.warning++
      else totalIssues.info++
    }
  }

  // Normalizar por cantidad de registros para no penalizar más los datasets grandes
  const criticalRate = totalIssues.critical / recordCount
  const warningRate = totalIssues.warning / recordCount
  const infoRate = totalIssues.info / recordCount

  const penalty =
    Math.min(criticalRate * 50, 50) +
    Math.min(warningRate * 20, 30) +
    Math.min(infoRate * 5, 10)

  return Math.max(0, Math.round(100 - penalty))
}

/** Construye el informe global a partir de los resultados por endpoint */
export function buildFullReport(
  endpoints: EndpointAuditResult[],
  durationMs: number
): FullAuditReport {
  const successful = endpoints.filter((e) => !e.error)

  const totalRecords = successful.reduce((s, e) => s + e.recordCount, 0)
  const totalIssues = successful.reduce((s, e) => s + e.summary.totalIssues, 0)
  const criticalCount = successful.reduce((s, e) => s + e.summary.criticalCount, 0)
  const warningCount = successful.reduce((s, e) => s + e.summary.warningCount, 0)
  const infoCount = successful.reduce((s, e) => s + e.summary.infoCount, 0)

  const overallHealthScore =
    successful.length > 0
      ? Math.round(successful.reduce((s, e) => s + e.summary.healthScore, 0) / successful.length)
      : 0

  return {
    timestamp: new Date().toISOString(),
    durationMs,
    endpoints,
    globalSummary: {
      totalEndpoints: endpoints.length,
      successfulEndpoints: successful.length,
      totalRecords,
      totalIssues,
      criticalCount,
      warningCount,
      infoCount,
      overallHealthScore,
    },
  }
}

/** Construye el summary de un endpoint a partir de sus fields */
export function buildEndpointSummary(fields: FieldAnalysis[], recordCount: number) {
  const allIssues = fields.flatMap((f) => f.issues)
  const criticalCount = allIssues.filter((i) => i.severity === "critical").length
  const warningCount = allIssues.filter((i) => i.severity === "warning").length
  const infoCount = allIssues.filter((i) => i.severity === "info").length

  return {
    totalIssues: allIssues.length,
    criticalCount,
    warningCount,
    infoCount,
    healthScore: calculateHealthScore(fields, recordCount),
  }
}
