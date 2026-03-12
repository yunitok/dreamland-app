/**
 * Tipos de respuesta de la API de GStock para endpoints de costes.
 * Basado en respuestas reales de v1/costReals, v1/costTheoreticals, v1/stockVariations.
 *
 * NOTA: GStock usa camelCase en las respuestas JSON.
 */

// ─── costReals ──────────────────────────────────────────────
// En la práctica costReals suele devolver data:[] vacío.
// Cuando tiene datos, devuelve estructura similar a costTheoreticals.

export interface GstockCostRealSummary {
  centerId?: number
  startDate?: string
  endDate?: string
  costTotal?: number
  netSaleTotal?: number
  categories?: { posCategoryId: number; name: string; quantity: number; amount?: number }[]
}

// ─── costTheoreticals ───────────────────────────────────────

export interface GstockCostTheoreticalSection {
  netSaleTotal: number
  costTotal: number
  costPercentageTotal: number
  marginTotal: number
  marginPercentageTotal: number
  categories?: { posCategoryId: number; name: string; quantity: number }[]
}

export interface GstockCostTheoreticalSummary {
  id: string
  centerId: number
  startDate: string
  endDate: string
  name: string
  shrinkageTotal: number
  netSaleTotal: number
  costTotal: number
  costPercentageTotal: number
  marginTotal: number
  marginPercentageTotal: number
  carte?: GstockCostTheoreticalSection
  packs?: GstockCostTheoreticalSection
}

// ─── stockVariations ────────────────────────────────────────

export interface GstockStockVariationSummary {
  totalVariation?: number
  items?: { id: number; name: string; variation: number; amount?: number }[]
}

// ─── Sync types ─────────────────────────────────────────────

export interface FoodCostSyncResult {
  locationId: string
  locationName: string
  centerId: number
  periodStart: string
  periodEnd: string
  realCostTotal: number
  theoreticalCostTotal: number
  variance: number
  variancePercent: number
  periodRevenue: number | null
  foodCostPercent: number | null
  stockVariationTotal: number | null
  status: "created" | "updated" | "skipped" | "error"
  error?: string
}

export interface FoodCostSyncReport {
  totalLocations: number
  processed: number
  created: number
  updated: number
  errors: number
  results: FoodCostSyncResult[]
}
