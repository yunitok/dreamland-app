/**
 * Normalización de nombres de recetas para matching cross-system.
 *
 * Maneja diferencias entre GStock (MAYÚSCULAS, nombres cortos)
 * y Yurest (Title Case, prefijos como "Salsa de", "Mayonesa de").
 */

const PREFIXES_TO_STRIP = [
  "salsa de ",
  "salsa ",
  "mayonesa de ",
  "crema de ",
  "pure de ",
  "puré de ",
  "caldo de ",
  "aliño de ",
  "aliño ",
  "base de ",
  "base ",
  "mezcla de ",
  "mezcla ",
]

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "con", "en", "al", "a", "y", "o", "por", "para",
])

/**
 * Normaliza un nombre de receta para comparación:
 * - Lowercase
 * - Quitar tildes/diacríticos
 * - Quitar prefijos comunes de Yurest
 * - Quitar stopwords
 * - Solo alfanumérico + espacios
 */
export function normalize(name: string): string {
  let result = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar diacríticos

  // Quitar prefijos comunes (solo al inicio)
  for (const prefix of PREFIXES_TO_STRIP) {
    const normalizedPrefix = prefix.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (result.startsWith(normalizedPrefix)) {
      result = result.slice(normalizedPrefix.length)
      break // solo quitar un prefijo
    }
  }

  result = result
    .replace(/[^a-z0-9 ]/g, " ") // solo alfanumérico + espacios
    .replace(/\s+/g, " ")
    .trim()

  return result
}

/**
 * Tokeniza un nombre normalizado en palabras individuales,
 * filtrando stopwords y tokens vacíos.
 */
export function tokenize(normalized: string): string[] {
  return normalized
    .split(" ")
    .filter(t => t.length > 0 && !STOPWORDS.has(t))
}

/**
 * Normaliza y tokeniza en un solo paso.
 */
export function normalizeAndTokenize(name: string): { normalized: string; tokens: string[] } {
  const normalized = normalize(name)
  const tokens = tokenize(normalized)
  return { normalized, tokens }
}
