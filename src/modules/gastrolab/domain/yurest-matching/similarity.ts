/**
 * Algoritmos de similitud de strings para matching de recetas.
 * Sin dependencias externas.
 */

/**
 * Distancia de Levenshtein entre dos strings.
 * Optimización: solo dos filas de la matriz (O(min(m,n)) espacio).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Asegurar que a es la más corta (optimización de espacio)
  if (a.length > b.length) [a, b] = [b, a]

  let prev = Array.from({ length: a.length + 1 }, (_, i) => i)
  let curr = new Array(a.length + 1)

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        prev[i] + 1,      // eliminación
        curr[i - 1] + 1,  // inserción
        prev[i - 1] + cost // sustitución
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[a.length]
}

/**
 * Similitud de Levenshtein normalizada: 1 - (distancia / maxLen).
 * Resultado en rango [0, 1] donde 1 = idénticos.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

/**
 * Coeficiente de Jaccard sobre conjuntos de tokens.
 * |A ∩ B| / |A ∪ B| → [0, 1]
 */
export function jaccardTokens(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1
  if (tokensA.length === 0 || tokensB.length === 0) return 0

  const setA = new Set(tokensA)
  const setB = new Set(tokensB)

  let intersection = 0
  for (const t of setA) {
    if (setB.has(t)) intersection++
  }

  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Score de contención: qué % de tokens del set menor están en el mayor.
 * Util cuando un nombre es subconjunto del otro (ej: "BUTTER CHICKEN" ⊆ "Salsa butter chicken").
 */
export function containmentScore(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1
  if (tokensA.length === 0 || tokensB.length === 0) return 0

  // El set menor es el que queremos verificar si está contenido en el mayor
  const [smaller, larger] = tokensA.length <= tokensB.length
    ? [tokensA, new Set(tokensB)]
    : [tokensB, new Set(tokensA)]

  let contained = 0
  for (const t of smaller) {
    if (larger.has(t)) contained++
  }

  return smaller.length === 0 ? 0 : contained / smaller.length
}
