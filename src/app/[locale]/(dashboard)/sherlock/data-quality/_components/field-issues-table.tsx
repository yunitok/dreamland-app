"use client"

import type { FieldAnalysis, IssueSeverity, IssueType, TextIssue } from "@/modules/sherlock/domain/data-quality/types"

const severityVariant: Record<IssueSeverity, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-200 dark:text-red-400",
  warning: "bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400",
  info: "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400",
}

const issueTypeLabel: Record<IssueType, string> = {
  potential_duplicate: "Duplicado potencial",
  mixed_case: "Case inconsistente",
  leading_trailing_whitespace: "Espacios inicio/fin",
  double_spaces: "Espacios dobles",
  inconsistent_diacritics: "Tildes inconsistentes",
  empty_vs_null: "Vacío en vez de null",
  special_characters: "Caracteres especiales",
}

/**
 * Renderiza el valor de una issue destacando visualmente el problema exacto.
 * - double_spaces: marca los espacios múltiples con ·
 * - leading_trailing_whitespace: marca el espacio con ▸ / ◂
 * - special_characters: resalta los caracteres problemáticos en rojo
 * - empty_vs_null: muestra "" en cursiva
 * - resto: texto plano truncado
 */
function HighlightedValue({ issue }: { issue: TextIssue }) {
  const { value, type } = issue

  if (value === "") {
    return <span className="text-muted-foreground italic font-mono text-xs">""</span>
  }

  if (type === "double_spaces") {
    // Dividir por secuencias de 2+ espacios y marcarlas
    const parts = value.split(/(\s{2,})/)
    return (
      <span className="font-mono text-xs" title={value}>
        {parts.map((part, i) =>
          /\s{2,}/.test(part) ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 rounded px-0.5">
              {"·".repeat(part.length)}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    )
  }

  if (type === "leading_trailing_whitespace") {
    const trimmed = value.trim()
    const leadingSpaces = value.length - value.trimStart().length
    const trailingSpaces = value.length - value.trimEnd().length
    return (
      <span className="font-mono text-xs" title={value}>
        {leadingSpaces > 0 && (
          <mark className="bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 rounded px-0.5">
            {"▸".repeat(leadingSpaces)}
          </mark>
        )}
        <span>{trimmed}</span>
        {trailingSpaces > 0 && (
          <mark className="bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 rounded px-0.5">
            {"◂".repeat(trailingSpaces)}
          </mark>
        )}
      </span>
    )
  }

  if (type === "special_characters") {
    // Resaltar caracteres especiales (no alfanuméricos/puntuación estándar) en rojo
    const parts = value.split(/([^\p{L}\p{N}\s\-().,/&%'"°#:!?])/u)
    return (
      <span className="font-mono text-xs" title={value}>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="bg-red-200 dark:bg-red-800/60 text-red-800 dark:text-red-200 rounded px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    )
  }

  // Resto de tipos: texto plano con truncado
  return (
    <span className="font-mono text-xs truncate max-w-50 block" title={value}>
      {value}
    </span>
  )
}

interface FieldIssuesTableProps {
  field: FieldAnalysis
}

export function FieldIssuesTable({ field }: FieldIssuesTableProps) {
  if (field.issues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Sin problemas detectados en este campo
      </p>
    )
  }

  return (
    <div className="overflow-auto max-h-[400px] rounded-md border text-sm">
      <table className="w-full">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">ID</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Valor actual</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">Tipo</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">Severidad</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Sugerencia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {field.issues.map((issue, i) => (
            <tr key={i} className="hover:bg-accent/30">
              <td className="px-3 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                {issue.recordId}
              </td>
              <td className="px-3 py-2 max-w-65">
                <HighlightedValue issue={issue} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-xs">{issueTypeLabel[issue.type]}</span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${severityVariant[issue.severity]}`}>
                  {issue.severity}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground max-w-62.5">
                <span className="line-clamp-2" title={issue.suggestion}>
                  {issue.suggestion ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
