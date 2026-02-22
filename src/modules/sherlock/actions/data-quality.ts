"use server"

import { requirePermission } from "@/lib/actions/rbac"
import { fetchGstock } from "@/lib/gstock"
import { AUDITABLE_ENDPOINTS } from "@/modules/sherlock/domain/data-quality/endpoint-config"
import { analyzeField, detectStringFields } from "@/modules/sherlock/domain/data-quality/analyzers"
import { buildEndpointSummary, buildFullReport } from "@/modules/sherlock/domain/data-quality/report-builder"
import type {
  EndpointAuditResult,
  FieldAnalysis,
  FullAuditReport,
} from "@/modules/sherlock/domain/data-quality/types"

/** Ejecuta la auditoría completa de todos los endpoints de GStock */
export async function runFullDataQualityAudit(): Promise<{
  success: boolean
  data?: FullAuditReport
  error?: string
}> {
  await requirePermission("sherlock", "manage")

  const startTime = Date.now()
  const results: EndpointAuditResult[] = []

  for (const endpointConfig of AUDITABLE_ENDPOINTS) {
    const fetchStart = Date.now()

    try {
      const response = await fetchGstock<Record<string, unknown>>(endpointConfig.path)
      const records = Array.isArray(response.data) ? response.data : []
      const fetchTimeMs = Date.now() - fetchStart

      const stringFields = detectStringFields(records)
      const fields: FieldAnalysis[] = stringFields.map((fieldName) =>
        analyzeField(records, fieldName, endpointConfig.idField)
      )
      const summary = buildEndpointSummary(fields, records.length)

      results.push({
        endpoint: endpointConfig.path,
        label: endpointConfig.label,
        sherlockMapping: endpointConfig.sherlockMapping,
        recordCount: records.length,
        fetchTimeMs,
        fields,
        summary,
      })
    } catch (err) {
      const fetchTimeMs = Date.now() - fetchStart
      const message = err instanceof Error ? err.message : String(err)

      results.push({
        endpoint: endpointConfig.path,
        label: endpointConfig.label,
        sherlockMapping: endpointConfig.sherlockMapping,
        recordCount: 0,
        fetchTimeMs,
        fields: [],
        summary: { totalIssues: 0, criticalCount: 0, warningCount: 0, infoCount: 0, healthScore: 0 },
        error: message,
      })
    }
  }

  const report = buildFullReport(results, Date.now() - startTime)
  return { success: true, data: report }
}

/** Audita un único endpoint de GStock (para drill-down rápido) */
export async function auditSingleEndpoint(endpointPath: string): Promise<{
  success: boolean
  data?: EndpointAuditResult
  error?: string
}> {
  await requirePermission("sherlock", "read")

  const config = AUDITABLE_ENDPOINTS.find((e) => e.path === endpointPath)
  if (!config) {
    return { success: false, error: "Endpoint no encontrado en la configuración de auditoría" }
  }

  const fetchStart = Date.now()

  try {
    const response = await fetchGstock<Record<string, unknown>>(config.path)
    const records = Array.isArray(response.data) ? response.data : []
    const fetchTimeMs = Date.now() - fetchStart

    const stringFields = detectStringFields(records)
    const fields: FieldAnalysis[] = stringFields.map((fieldName) =>
      analyzeField(records, fieldName, config.idField)
    )
    const summary = buildEndpointSummary(fields, records.length)

    return {
      success: true,
      data: {
        endpoint: config.path,
        label: config.label,
        sherlockMapping: config.sherlockMapping,
        recordCount: records.length,
        fetchTimeMs,
        fields,
        summary,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
