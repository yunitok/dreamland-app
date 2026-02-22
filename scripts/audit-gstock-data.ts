/**
 * Auditoría de normalización de datos GStock.
 *
 * Conecta al API de GStock, analiza todos los campos de texto de los endpoints
 * que mapean a modelos de Sherlock y genera un informe de calidad de datos.
 *
 * Ejecutar: npx tsx scripts/audit-gstock-data.ts
 */

import "dotenv/config"
import { fetchGstock } from "../src/lib/gstock"
import { AUDITABLE_ENDPOINTS } from "../src/modules/sherlock/domain/data-quality/endpoint-config"
import { analyzeField, detectStringFields } from "../src/modules/sherlock/domain/data-quality/analyzers"
import { buildEndpointSummary, buildFullReport } from "../src/modules/sherlock/domain/data-quality/report-builder"
import type { EndpointAuditResult, FieldAnalysis } from "../src/modules/sherlock/domain/data-quality/types"

// ─── Colores ANSI ──────────────────────────────────────────────────────────────
const RESET = "\x1b[0m"
const BOLD  = "\x1b[1m"
const DIM   = "\x1b[2m"
const RED   = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const BLUE  = "\x1b[34m"
const CYAN  = "\x1b[36m"

const b = (s: string) => BOLD + s + RESET
const d = (s: string) => DIM + s + RESET
const r = (s: string) => RED + s + RESET
const g = (s: string) => GREEN + s + RESET
const y = (s: string) => YELLOW + s + RESET
const bl = (s: string) => BLUE + s + RESET
const cy = (s: string) => CYAN + s + RESET

function healthColor(score: number, s: string): string {
  if (score >= 80) return GREEN + s + RESET
  if (score >= 50) return YELLOW + s + RESET
  return RED + s + RESET
}

function severityIcon(severity: string): string {
  if (severity === "critical") return r("●")
  if (severity === "warning") return y("●")
  return bl("●")
}

// ─── Formato del informe ───────────────────────────────────────────────────────

function printFieldAnalysis(field: FieldAnalysis) {
  const nonNull = field.totalValues - field.nullCount - field.emptyCount
  const fieldHeader = b(cy("Campo \"" + field.fieldName + "\""))
  const fieldMeta = d(" (" + nonNull + " valores, " + field.uniqueValues + " únicos, " + field.nullCount + " nulos, " + field.emptyCount + " vacíos)")
  console.log("\n   " + fieldHeader + fieldMeta)

  // Distribución de case
  const dist = field.caseDistribution
  const total = dist.allUpper + dist.allLower + dist.titleCase + dist.mixed
  if (total > 0) {
    const pct = (n: number) => Math.round((n / total) * 100) + "%"
    const parts: string[] = []
    if (dist.allUpper > 0)  parts.push(dist.allUpper + " UPPER(" + pct(dist.allUpper) + ")")
    if (dist.titleCase > 0) parts.push(dist.titleCase + " Title(" + pct(dist.titleCase) + ")")
    if (dist.allLower > 0)  parts.push(dist.allLower + " lower(" + pct(dist.allLower) + ")")
    if (dist.mixed > 0)     parts.push(dist.mixed + " miXed(" + pct(dist.mixed) + ")")
    console.log("   " + d("│") + " " + d("Case:") + " " + parts.join(" · "))
  }

  if (field.issues.length === 0) {
    console.log("   " + d("│") + " " + g("✓ Sin problemas"))
    return
  }

  // Agrupar issues por tipo
  const byType = new Map<string, typeof field.issues>()
  for (const issue of field.issues) {
    if (!byType.has(issue.type)) byType.set(issue.type, [])
    byType.get(issue.type)!.push(issue)
  }

  const typeLabels: Record<string, string> = {
    potential_duplicate: "Duplicados potenciales",
    mixed_case: "Case inconsistente",
    leading_trailing_whitespace: "Espacios al inicio/final",
    double_spaces: "Espacios dobles",
    inconsistent_diacritics: "Tildes inconsistentes",
    empty_vs_null: "Strings vacíos (usar null)",
    special_characters: "Caracteres especiales",
  }

  for (const [type, issues] of byType) {
    const sample = issues[0]
    const icon = severityIcon(sample.severity)
    const label = typeLabels[type] ?? type
    console.log("   " + d("│") + " " + icon + " " + b(label) + " (" + issues.length + ")")

    // Mostrar los primeros 3 ejemplos
    const shown = issues.slice(0, 3)
    for (const issue of shown) {
      console.log("   " + d("│") + "   " + d("id:" + issue.recordId) + " \"" + issue.value + "\"")
      if (issue.relatedValues?.length) {
        const related = issue.relatedValues.map(function(v) { return "\"" + v + "\"" }).join(" / ")
        console.log("   " + d("│") + "   " + d("↳ " + related))
      }
    }
    if (issues.length > 3) {
      console.log("   " + d("│") + "   " + d("... y " + (issues.length - 3) + " más"))
    }
    if (sample.suggestion && issues.length <= 3) {
      console.log("   " + d("│") + "   " + d("💡 " + sample.suggestion))
    }
  }
}

function printEndpointResult(result: EndpointAuditResult) {
  const score = result.summary.healthScore
  const mapping = result.sherlockMapping ? d(" → " + result.sherlockMapping) : ""
  const status = result.error
    ? r("ERROR")
    : healthColor(score, "Health: " + score + "/100")

  console.log("\n" + "─".repeat(60))
  console.log("📦 " + b(result.label) + mapping + "  " + d(result.endpoint))
  console.log("   " + status + "  " + d(result.recordCount + " registros · " + result.fetchTimeMs + "ms"))

  if (result.error) {
    console.log("   " + r("✗") + " " + result.error)
    return
  }

  const { criticalCount, warningCount, infoCount } = result.summary
  if (criticalCount > 0) {
    console.log("   " + r("● " + criticalCount + " críticos") + "  " + y("● " + warningCount + " warnings") + "  " + bl("● " + infoCount + " info"))
  } else if (warningCount > 0) {
    console.log("   " + y("● " + warningCount + " warnings") + "  " + bl("● " + infoCount + " info"))
  } else if (infoCount > 0) {
    console.log("   " + bl("● " + infoCount + " info"))
  } else {
    console.log("   " + g("✓ Sin problemas detectados"))
  }

  // Mostrar solo campos con issues, o los primeros 3 si no hay issues
  const fieldsWithIssues = result.fields.filter(function(f) { return f.issues.length > 0 })
  const fieldsToShow = fieldsWithIssues.length > 0 ? fieldsWithIssues : result.fields.slice(0, 3)

  for (const field of fieldsToShow) {
    printFieldAnalysis(field)
  }

  if (fieldsWithIssues.length === 0 && result.fields.length > 3) {
    console.log(d("   ... y " + (result.fields.length - 3) + " campos más sin problemas"))
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(b("\n" + "═".repeat(60)))
  console.log(b("  GStock Data Quality Audit"))
  console.log(b("  Dreamland App · " + new Date().toLocaleString("es-ES")))
  console.log(b("═".repeat(60)) + "\n")

  const startTime = Date.now()
  const results: EndpointAuditResult[] = []

  for (const endpointConfig of AUDITABLE_ENDPOINTS) {
    process.stdout.write("⏳ Fetching " + endpointConfig.path + "...")
    const fetchStart = Date.now()

    try {
      const response = await fetchGstock<Record<string, unknown>>(endpointConfig.path)
      const records = Array.isArray(response.data) ? response.data : []
      const fetchTimeMs = Date.now() - fetchStart

      process.stdout.write(" " + g("✓") + " " + records.length + " registros\n")

      // Auto-detectar campos string
      const stringFields = detectStringFields(records)

      // Analizar cada campo
      const fields: FieldAnalysis[] = stringFields.map(function(fieldName) {
        return analyzeField(records, fieldName, endpointConfig.idField)
      })

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
      process.stdout.write(" " + r("✗") + "\n")
      console.error("   " + r("Error:") + " " + message)

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

  // ─── Informe detallado ───────────────────────────────────────────────────────
  console.log("\n" + b("═".repeat(60)))
  console.log(b("  INFORME DETALLADO"))
  console.log(b("═".repeat(60)))

  // Ordenar: primero los que tienen errores, luego por health score ascendente
  const sorted = [...results].sort(function(a, b2) {
    if (a.error && !b2.error) return -1
    if (!a.error && b2.error) return 1
    return a.summary.healthScore - b2.summary.healthScore
  })

  for (const result of sorted) {
    printEndpointResult(result)
  }

  // ─── Resumen global ──────────────────────────────────────────────────────────
  const report = buildFullReport(results, Date.now() - startTime)
  const gs = report.globalSummary

  console.log("\n" + "═".repeat(60))
  console.log(b("  RESUMEN GLOBAL"))
  console.log("═".repeat(60))
  console.log("  Endpoints auditados:  " + gs.successfulEndpoints + "/" + gs.totalEndpoints)
  console.log("  Total registros:      " + b(String(gs.totalRecords)))
  console.log("  Total issues:         " + b(String(gs.totalIssues)))
  console.log("    " + r("● Críticos:  " + gs.criticalCount))
  console.log("    " + y("● Warnings:  " + gs.warningCount))
  console.log("    " + bl("● Info:      " + gs.infoCount))
  console.log("  Health Score global:  " + healthColor(gs.overallHealthScore, b(gs.overallHealthScore + "/100")))
  console.log("  Tiempo total:         " + d(report.durationMs + "ms"))
  console.log("═".repeat(60))

  // Ranking de endpoints problemáticos
  const problematic = results
    .filter(function(re) { return !re.error && re.summary.totalIssues > 0 })
    .sort(function(a, b2) { return a.summary.healthScore - b2.summary.healthScore })
    .slice(0, 5)

  if (problematic.length > 0) {
    console.log("\n  " + b("Top endpoints con más problemas:"))
    for (const ep of problematic) {
      const scoreStr = healthColor(ep.summary.healthScore, ep.summary.healthScore + "/100")
      const issueStr = r("(" + ep.summary.criticalCount + "● " + ep.summary.warningCount + "●)")
      console.log("  " + scoreStr.padEnd(12) + " " + ep.label + " " + issueStr)
    }
  }

  console.log()
}

main()
  .catch(function(e) {
    console.error(r("\n❌ Error fatal: " + (e instanceof Error ? e.message : String(e))))
    process.exit(1)
  })
