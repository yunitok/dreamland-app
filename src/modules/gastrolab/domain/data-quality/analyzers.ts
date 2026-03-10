import type { CaseDistribution, FieldAnalysis, TextIssue } from "./types"

// ─── Utilidades de normalización ─────────────────────────────────────────────

/** Normaliza un string para comparación: trim + lowercase + sin diacríticos */
export function normalizeForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/** Comprueba si un string está en ALL CAPS */
function isAllUpper(s: string): boolean {
  return s === s.toUpperCase() && s !== s.toLowerCase()
}

/** Comprueba si un string está en all lower */
function isAllLower(s: string): boolean {
  return s === s.toLowerCase() && s !== s.toUpperCase()
}

/** Comprueba si un string está en Title Case (primera letra de cada palabra en mayúscula) */
function isTitleCase(s: string): boolean {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => word[0] === word[0]?.toUpperCase())
}

/** Clasifica el case de un string */
function classifyCase(s: string): keyof CaseDistribution {
  if (isAllUpper(s)) return "allUpper"
  if (isAllLower(s)) return "allLower"
  if (isTitleCase(s)) return "titleCase"
  return "mixed"
}

/** Detecta si un string parece una fecha ISO 8601 */
function looksLikeIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T[\d:+\-.Z]+)?$/.test(s)
}

/** Detecta si un string parece un UUID */
function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

/** Detecta si la mayoría de los valores de un campo son fechas ISO o UUIDs (campo de sistema, no auditable) */
function isSystemField(values: { value: string }[]): boolean {
  if (values.length === 0) return false
  const sample = values.slice(0, 10)
  const systemCount = sample.filter(
    (v) => looksLikeIsoDate(v.value) || looksLikeUuid(v.value)
  ).length
  return systemCount / sample.length > 0.7
}

/** Detecta caracteres especiales no habituales en nombres de productos/recetas */
function hasSpecialCharacters(s: string): boolean {
  // Permite letras (incluido español/europeo), números, espacios, guiones, paréntesis, punto, coma, /, &, %
  return /[^\p{L}\p{N}\s\-().,/&%'"°#:!?]/u.test(s)
}

// ─── Análisis de un campo ─────────────────────────────────────────────────────

/**
 * Analiza todos los valores string de un campo en un array de registros.
 * Auto-detecta el campo idField para incluir en las issues.
 */
export function analyzeField(
  records: Record<string, unknown>[],
  fieldName: string,
  idField = "id"
): FieldAnalysis {
  const issues: TextIssue[] = []
  const caseDistribution: CaseDistribution = {
    allUpper: 0,
    allLower: 0,
    titleCase: 0,
    mixed: 0,
  }

  let nullCount = 0
  let emptyCount = 0
  const nonNullValues: { id: string | number; value: string }[] = []

  // 1. Recoger valores
  for (const record of records) {
    const rawId = record[idField]
    const id = rawId !== undefined && rawId !== null ? String(rawId) : String(records.indexOf(record))
    const raw = record[fieldName]

    if (raw === null || raw === undefined) {
      nullCount++
      continue
    }

    const value = String(raw)

    if (value === "") {
      emptyCount++
      issues.push({
        type: "empty_vs_null",
        severity: "info",
        field: fieldName,
        value: "",
        recordId: id,
        suggestion: 'Usar null en lugar de string vacío ""',
      })
      continue
    }

    nonNullValues.push({ id, value })
  }

  // 2. Análisis de case y whitespace
  for (const { id, value } of nonNullValues) {
    // Case distribution
    const caseType = classifyCase(value)
    caseDistribution[caseType]++

    // Whitespace al inicio/final
    if (value !== value.trim()) {
      issues.push({
        type: "leading_trailing_whitespace",
        severity: "warning",
        field: fieldName,
        value,
        recordId: id,
        suggestion: `Aplicar .trim() → "${value.trim()}"`,
      })
    }

    // Espacios dobles internos
    if (/\s{2,}/.test(value)) {
      issues.push({
        type: "double_spaces",
        severity: "warning",
        field: fieldName,
        value,
        recordId: id,
        suggestion: `Eliminar espacios dobles → "${value.replace(/\s{2,}/g, " ")}"`,
      })
    }

    // Caracteres especiales
    if (hasSpecialCharacters(value)) {
      issues.push({
        type: "special_characters",
        severity: "info",
        field: fieldName,
        value,
        recordId: id,
        suggestion: "Revisar si los caracteres especiales son intencionados",
      })
    }
  }

  // 3. Detección de case inconsistente a nivel de campo
  const caseCounts = [
    caseDistribution.allUpper,
    caseDistribution.allLower,
    caseDistribution.titleCase,
    caseDistribution.mixed,
  ]
  const dominantTypes = caseCounts.filter((c) => c > 0).length
  if (dominantTypes > 1 && nonNullValues.length >= 2) {
    // Hay mezcla de estilos → issue por cada valor no-dominante
    const dominant = (["allUpper", "allLower", "titleCase", "mixed"] as const).reduce((a, b) =>
      caseDistribution[a] >= caseDistribution[b] ? a : b
    )
    const suggestions: Record<string, string> = {
      allUpper: "Convertir todo a MAYÚSCULAS",
      allLower: "Convertir todo a minúsculas",
      titleCase: "Convertir todo a Title Case",
      mixed: "Unificar el formato de capitalización",
    }
    for (const { id, value } of nonNullValues) {
      if (classifyCase(value) !== dominant) {
        issues.push({
          type: "mixed_case",
          severity: "warning",
          field: fieldName,
          value,
          recordId: id,
          suggestion: suggestions[dominant],
        })
      }
    }
  }

  // 4. Detección de duplicados potenciales (mismo valor normalizado, diferente original)
  const normalizedMap = new Map<string, { id: string | number; value: string }[]>()
  for (const item of nonNullValues) {
    const norm = normalizeForComparison(item.value)
    if (!normalizedMap.has(norm)) normalizedMap.set(norm, [])
    normalizedMap.get(norm)!.push(item)
  }

  for (const [, group] of normalizedMap) {
    if (group.length < 2) continue
    const uniqueOriginals = [...new Set(group.map((g) => g.value))]
    if (uniqueOriginals.length < 2) continue // Todos iguales, no es un problema

    for (const { id, value } of group) {
      const others = uniqueOriginals.filter((v) => v !== value)
      issues.push({
        type: "potential_duplicate",
        severity: "critical",
        field: fieldName,
        value,
        recordId: id,
        suggestion: `Posible duplicado de: ${others.map((v) => `"${v}"`).join(", ")}`,
        relatedValues: others,
      })
    }
  }

  // 5. Detección de diacríticos inconsistentes
  // Dos valores que solo difieren en tildes (pero no son duplicados exactos)
  const noAccentMap = new Map<string, Set<string>>()
  for (const { value } of nonNullValues) {
    const withoutAccents = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    if (!noAccentMap.has(withoutAccents)) noAccentMap.set(withoutAccents, new Set())
    noAccentMap.get(withoutAccents)!.add(value.toLowerCase())
  }

  const diacriticPairs = new Set<string>()
  for (const [norm, originals] of noAccentMap) {
    if (originals.size < 2) continue
    // Verificar que la diferencia es solo en tildes y no es ya un duplicado detectado
    const key = [...originals].sort().join("|")
    if (diacriticPairs.has(key)) continue
    diacriticPairs.add(key)

    for (const { id, value } of nonNullValues) {
      const valNorm = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
      if (valNorm !== norm) continue
      const others = [...originals].filter((o) => o !== value.toLowerCase())
      // Solo reportar si no ya está como potential_duplicate
      const alreadyDup = issues.some(
        (i) => i.type === "potential_duplicate" && String(i.recordId) === String(id) && i.field === fieldName
      )
      if (!alreadyDup) {
        issues.push({
          type: "inconsistent_diacritics",
          severity: "warning",
          field: fieldName,
          value,
          recordId: id,
          suggestion: `Inconsistencia de tildes con: ${others.map((v) => `"${v}"`).join(", ")}`,
          relatedValues: others,
        })
      }
    }
  }

  const uniqueValues = new Set(nonNullValues.map((v) => v.value)).size

  return {
    fieldName,
    totalValues: records.length,
    uniqueValues,
    nullCount,
    emptyCount,
    caseDistribution,
    issues,
  }
}

/**
 * Detecta automáticamente qué campos son string en un conjunto de registros
 * y devuelve sus nombres.
 */
export function detectStringFields(records: Record<string, unknown>[]): string[] {
  if (records.length === 0) return []

  const fieldCandidates = new Map<string, number>() // field → count of string values

  for (const record of records.slice(0, 20)) {
    // Muestra los primeros 20 para detectar tipos
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        fieldCandidates.set(key, (fieldCandidates.get(key) ?? 0) + 1)
      }
    }
  }

  // Solo incluir campos que son string en al menos el 50% de los registros de la muestra
  const threshold = Math.min(records.length, 20) * 0.5
  const candidates = [...fieldCandidates.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([key]) => key)

  // Excluir campos de sistema: fechas ISO, UUIDs (no son campos de texto a normalizar)
  return candidates.filter((key) => {
    const sample = records
      .slice(0, 10)
      .map((r) => r[key])
      .filter((v): v is string => typeof v === "string" && v !== "")
    if (sample.length === 0) return true
    const systemRatio = sample.filter((v) => looksLikeIsoDate(v) || looksLikeUuid(v)).length / sample.length
    return systemRatio <= 0.7
  })
}
