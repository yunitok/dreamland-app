// Re-export the generic API response wrapper from the shared GStock client
export type { GstockApiResponse } from "@/lib/gstock"

// GStock devuelve IDs como números (Int), no como strings
type GstockId = string | number

export interface GstockMeasureUnit {
  id: GstockId
  name: string
  // El campo de abreviatura puede tener nombres diferentes según la versión de API
  abbreviation?: string
  abbr?: string
  symbol?: string
  shortName?: string
  type?: 'VOLUME' | 'WEIGHT' | 'UNIT'
  conversionFactor?: number
  isBase?: boolean
  [key: string]: unknown
}

export interface GstockCategory {
  id: GstockId
  name: string
  description?: string
  parentId?: GstockId
}

export interface GstockRecipeCategory {
  id: GstockId
  name: string
  description?: string
}

export interface GstockRecipeFamily {
  id: GstockId
  name: string
  description?: string
}

export interface GstockSupplier {
  id: GstockId
  name: string
  reference?: string
  nameRegistered?: string
  email?: string
  phone1?: string
  phone2?: string
  mobile?: string
  fax?: string
  contactPerson?: string
  web?: string
  address?: string
  addressNumber?: string
  addressAdditional?: string
  addressFloor?: string
  addressLetter?: string
  cityName?: string
  codePostal?: string
  cityCode?: string
  provinceCode?: string
  province?: string
  countryCode?: string
  country?: string
  languageCode?: string
  CIF?: string
  paymentTerms?: string
  minOrder?: number
  discount?: number
  deliveryDays?: string
  notes?: string
  active?: boolean
  categoryId?: GstockId
  subcategoryId?: GstockId
  // Campos enriquecidos durante la sincronización (no vienen directamente de la API)
  categoryName?: string
  subcategoryName?: string
  [key: string]: unknown
}

export interface GstockProduct {
  id: GstockId
  name: string
  reference?: string
  categoryId?: GstockId
  measureUnitId?: GstockId
  familyId?: GstockId
  typeId?: GstockId
  subtypeId?: GstockId
  displayUnitId?: GstockId
  equivalenceBetweenMeasureAndDisplay?: number
  measurePriceLastPurchase?: number
  measurePriceAverage?: number
  taxRate?: number
  active?: boolean
  currentStock?: number
  minStock?: number
  maxStock?: number
  description?: string
}

// ─── Tipos para enriquecimiento de ingredientes (formatos, albaranes, stock) ──

export interface GstockFormat {
  id: GstockId
  productPurchaseId: GstockId
  name: string
  [key: string]: unknown
}

export interface GstockDeliveryItem {
  formatId: GstockId
  name: string
  quantity: number
  price: number
  tax: number
  [key: string]: unknown
}

export interface GstockDelivery {
  id: GstockId
  supplierId: GstockId
  date: string
  items: GstockDeliveryItem[]
  [key: string]: unknown
}

export interface GstockStockTheoretical {
  centerId: GstockId
  productId: GstockId
  total: number
  inventoryDate?: string
  [key: string]: unknown
}

// ─── Elaboraciones (pasos de preparación) ────────────────────

export interface GstockElaboration {
  id: string
  position: number
  description: string
}

// ─── Recetas ─────────────────────────────────────────────────

export interface GstockRecipeIngredientLine {
  productId?: GstockId
  recipeId?: GstockId
  quantityMeasure?: number
  quantityShrinkage?: number
}

export interface GstockRecipe {
  id: GstockId
  name: string
  categoryId?: GstockId
  familyId?: GstockId
  cost?: number
  /** Campo real de la API — anteriormente mapeado como "description" por error */
  shortDescription?: string
  /** @deprecated La API v2 devuelve "shortDescription", no "description". Mantenido por retrocompatibilidad */
  description?: string
  allergens?: string[] // raw allergen codes from GStock API (mapped to AllergenType in sync layer)
  elaborations?: GstockElaboration[]
  ingredients?: GstockRecipeIngredientLine[]
  subrecipes?: GstockRecipeIngredientLine[]
  // ─── Campos adicionales de la API v2 (no todos se mapean a Prisma) ───
  subrecipe?: boolean
  version?: number
  recipeParentId?: GstockId | null
  reference?: string
  startDate?: string
  endDate?: string | null
  subrecipeUnitId?: GstockId
  quantityUnitSubrecipe?: number
  percentageCost?: number
  suggestedPrice?: number
  active?: boolean
  urlInfo?: string
  image?: string
  creationDate?: string
  modificationDate?: string
  expirationDays?: number | null
  [key: string]: unknown
}

// Result type for each sync phase
export interface SyncPhaseResult {
  phase: string
  endpoint: string
  model: string
  created: number
  updated: number
  skipped: number
  errors: string[]
  durationMs: number
}

export interface SyncReport {
  phases: SyncPhaseResult[]
  kbEntries: number
  durationMs: number
  errors: string[]
}
