import type {
  GstockCostRealSummary,
  GstockCostTheoreticalSummary,
  GstockStockVariationSummary,
} from "./types"

/**
 * Extrae el total de coste real de la respuesta de GStock.
 * costReals suele devolver data:[] vacío — en ese caso retorna 0.
 */
export function extractRealCost(data: unknown[]): {
  total: number
  byCategory: { name: string; amount: number }[]
} {
  if (!data || data.length === 0) {
    return { total: 0, byCategory: [] }
  }

  const summary = data[0] as GstockCostRealSummary

  const total = summary.costTotal ?? 0
  const byCategory = (summary.categories ?? []).map((c) => ({
    name: c.name,
    amount: c.amount ?? 0,
  }))

  return { total, byCategory }
}

/**
 * Extrae el total de coste teórico de la respuesta de GStock.
 *
 * costTheoreticals devuelve registros semanales con:
 * { costTotal, netSaleTotal, carte: { costTotal }, packs: { costTotal } }
 *
 * Si hay múltiples registros (semanas), los suma.
 */
export function extractTheoreticalCost(data: unknown[]): number {
  if (!data || data.length === 0) return 0

  let total = 0
  for (const item of data) {
    const summary = item as GstockCostTheoreticalSummary
    total += summary.costTotal ?? 0
  }
  return total
}

/**
 * Extrae categorías agregadas de coste teórico (carte + packs).
 */
export function extractTheoreticalCategories(
  data: unknown[]
): { name: string; amount: number }[] {
  if (!data || data.length === 0) return []

  const byName = new Map<string, number>()

  for (const item of data) {
    const summary = item as GstockCostTheoreticalSummary
    const sections = [summary.carte, summary.packs].filter(Boolean)
    for (const section of sections) {
      for (const cat of section?.categories ?? []) {
        byName.set(cat.name, (byName.get(cat.name) ?? 0) + cat.quantity)
      }
    }
  }

  return Array.from(byName.entries()).map(([name, amount]) => ({ name, amount }))
}

/**
 * Extrae la variación de stock de la respuesta de GStock.
 */
export function extractStockVariation(data: unknown[]): number | null {
  if (!data || data.length === 0) return null
  const summary = data[0] as GstockStockVariationSummary
  return summary.totalVariation ?? null
}

/**
 * Calcula la varianza y el porcentaje de varianza.
 */
export function calculateVariance(
  realCost: number,
  theoreticalCost: number
): { variance: number; variancePercent: number } {
  const variance = realCost - theoreticalCost
  const variancePercent =
    theoreticalCost !== 0
      ? ((realCost - theoreticalCost) / theoreticalCost) * 100
      : 0

  return {
    variance: Math.round(variance * 100) / 100,
    variancePercent: Math.round(variancePercent * 100) / 100,
  }
}

/**
 * Calcula el food cost % sobre revenue.
 */
export function calculateFoodCostPercent(
  realCost: number,
  revenue: number | null
): number | null {
  if (!revenue || revenue === 0) return null
  return Math.round((realCost / revenue) * 10000) / 100
}
