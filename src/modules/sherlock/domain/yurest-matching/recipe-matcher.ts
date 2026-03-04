/**
 * Motor de matching entre recetas GStock (en Prisma) y Yurest.
 *
 * Capa 1: Similitud de nombre normalizado (barata)
 * Capa 2: Solapamiento de ingredientes (cara, solo para borderline)
 */

import { normalizeAndTokenize, normalize } from "./name-normalizer"
import { levenshteinSimilarity, jaccardTokens, containmentScore } from "./similarity"
import { fetchYurestRecipeDetail, type YurestRecipeListItem } from "@/lib/yurest"

// ─── Tipos ──────────────────────────────────────────────────────

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW"

export interface MatchResult {
  gstockRecipeId: string
  gstockName: string
  yurestId: number | null
  yurestName: string | null
  nameScore: number
  ingredientScore: number | null
  finalScore: number
  confidence: MatchConfidence
}

export interface GstockRecipeForMatching {
  id: string
  name: string
  ingredientNames: string[]
}

// ─── Umbrales ───────────────────────────────────────────────────

const THRESHOLD_HIGH = 0.85
const THRESHOLD_BORDERLINE = 0.60
const THRESHOLD_MEDIUM_FINAL = 0.70

// ─── Pesos del score por nombre ─────────────────────────────────

const W_LEVENSHTEIN = 0.5
const W_JACCARD = 0.3
const W_CONTAINMENT = 0.2

// ─── Pesos del score final (nombre + ingredientes) ─────────────

const W_NAME = 0.6
const W_INGREDIENTS = 0.4

// ─── Core ───────────────────────────────────────────────────────

function computeNameScore(gstockName: string, yurestName: string): number {
  const gstock = normalizeAndTokenize(gstockName)
  const yurest = normalizeAndTokenize(yurestName)

  const lev = levenshteinSimilarity(gstock.normalized, yurest.normalized)
  const jac = jaccardTokens(gstock.tokens, yurest.tokens)
  const cont = containmentScore(gstock.tokens, yurest.tokens)

  return W_LEVENSHTEIN * lev + W_JACCARD * jac + W_CONTAINMENT * cont
}

function computeIngredientScore(gstockIngredients: string[], yurestIngredients: string[]): number {
  const gstockNorm = gstockIngredients.map(normalize)
  const yurestNorm = yurestIngredients.map(normalize)
  return jaccardTokens(gstockNorm, yurestNorm)
}

interface CandidateMatch {
  yurestId: number
  yurestName: string
  nameScore: number
}

function findBestCandidate(
  gstockName: string,
  yurestRecipes: YurestRecipeListItem[]
): CandidateMatch | null {
  let best: CandidateMatch | null = null

  for (const yr of yurestRecipes) {
    const nameScore = computeNameScore(gstockName, yr.name)
    if (!best || nameScore > best.nameScore) {
      best = { yurestId: yr.id, yurestName: yr.name, nameScore }
    }
  }

  return best
}

// ─── API pública ────────────────────────────────────────────────

export interface MatchOptions {
  /** Callback de progreso */
  onProgress?: (msg: string) => void
  /** Delay entre llamadas a Yurest detail (ms) */
  apiDelayMs?: number
}

/**
 * Ejecuta el matching completo entre recetas GStock y Yurest.
 *
 * - Capa 1: todas las recetas GStock contra todas las Yurest (solo nombre)
 * - Capa 2: para borderline (0.60-0.85), fetch detalle Yurest y compara ingredientes
 */
export async function matchRecipes(
  gstockRecipes: GstockRecipeForMatching[],
  yurestRecipes: YurestRecipeListItem[],
  options: MatchOptions = {}
): Promise<MatchResult[]> {
  const { onProgress, apiDelayMs = 200 } = options
  const results: MatchResult[] = []

  for (const gr of gstockRecipes) {
    const candidate = findBestCandidate(gr.name, yurestRecipes)

    if (!candidate || candidate.nameScore < THRESHOLD_BORDERLINE) {
      // LOW — sin match viable
      results.push({
        gstockRecipeId: gr.id,
        gstockName: gr.name,
        yurestId: candidate?.yurestId ?? null,
        yurestName: candidate?.yurestName ?? null,
        nameScore: candidate?.nameScore ?? 0,
        ingredientScore: null,
        finalScore: candidate?.nameScore ?? 0,
        confidence: "LOW",
      })
      onProgress?.(`  LOW  ${gr.name} → (descartado, score=${(candidate?.nameScore ?? 0).toFixed(3)})`)
      continue
    }

    if (candidate.nameScore >= THRESHOLD_HIGH) {
      // HIGH — match automático
      results.push({
        gstockRecipeId: gr.id,
        gstockName: gr.name,
        yurestId: candidate.yurestId,
        yurestName: candidate.yurestName,
        nameScore: candidate.nameScore,
        ingredientScore: null,
        finalScore: candidate.nameScore,
        confidence: "HIGH",
      })
      onProgress?.(`  HIGH ${gr.name} → ${candidate.yurestName} (score=${candidate.nameScore.toFixed(3)})`)
      continue
    }

    // BORDERLINE — necesita validación por ingredientes (Capa 2)
    onProgress?.(`  ???  ${gr.name} → ${candidate.yurestName} (name=${candidate.nameScore.toFixed(3)}) — validando ingredientes...`)

    let ingredientScore = 0
    try {
      const detail = await fetchYurestRecipeDetail(candidate.yurestId)
      const yurestIngredientNames = detail.ingredients.map(i => i.product_name)
      ingredientScore = computeIngredientScore(gr.ingredientNames, yurestIngredientNames)
      await delay(apiDelayMs)
    } catch {
      onProgress?.(`       Error al obtener detalle de Yurest ${candidate.yurestId}, usando solo nombre`)
    }

    const finalScore = W_NAME * candidate.nameScore + W_INGREDIENTS * ingredientScore
    const confidence: MatchConfidence = finalScore >= THRESHOLD_MEDIUM_FINAL ? "MEDIUM" : "LOW"

    results.push({
      gstockRecipeId: gr.id,
      gstockName: gr.name,
      yurestId: candidate.yurestId,
      yurestName: candidate.yurestName,
      nameScore: candidate.nameScore,
      ingredientScore,
      finalScore,
      confidence,
    })
    onProgress?.(`  ${confidence.padEnd(4)} ${gr.name} → ${candidate.yurestName} (final=${finalScore.toFixed(3)}, ing=${ingredientScore.toFixed(3)})`)
  }

  return results
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
