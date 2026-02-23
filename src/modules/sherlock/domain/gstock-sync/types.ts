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
  code?: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  paymentTerms?: string
  minOrder?: number
}

export interface GstockProduct {
  id: GstockId
  name: string
  reference?: string
  categoryId?: GstockId
  supplierId?: GstockId
  measureUnitId?: GstockId
  costPrice?: number
  taxRate?: number
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'
  currentStock?: number
  minStock?: number
  maxStock?: number
  description?: string
}

export interface GstockRecipeIngredientLine {
  productId?: GstockId
  recipeId?: GstockId
  quantity?: number
  measureUnitId?: GstockId
}

export interface GstockRecipe {
  id: GstockId
  name: string
  categoryId?: GstockId
  familyId?: GstockId
  theoreticalCost?: number
  realCost?: number
  description?: string
  allergens?: string[] // raw allergen codes from GStock API (mapped to AllergenType in sync layer)
  ingredients?: GstockRecipeIngredientLine[]
  subrecipes?: GstockRecipeIngredientLine[]
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
