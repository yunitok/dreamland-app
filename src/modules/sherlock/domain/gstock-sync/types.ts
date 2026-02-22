// Re-export the generic API response wrapper from the shared GStock client
export type { GstockApiResponse } from "@/lib/gstock"

export interface GstockMeasureUnit {
  id: string
  name: string
  abbreviation: string
  type?: string // 'VOLUME' | 'WEIGHT' | 'UNIT'
  conversionFactor?: number
  isBase?: boolean
}

export interface GstockCategory {
  id: string
  name: string
  description?: string
  parentId?: string
}

export interface GstockRecipeCategory {
  id: string
  name: string
  description?: string
}

export interface GstockRecipeFamily {
  id: string
  name: string
  description?: string
}

export interface GstockSupplier {
  id: string
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
  id: string
  name: string
  reference?: string
  categoryId?: string
  supplierId?: string
  measureUnitId?: string
  costPrice?: number
  taxRate?: number
  status?: string
  currentStock?: number
  minStock?: number
  maxStock?: number
  description?: string
}

export interface GstockRecipeIngredientLine {
  productId?: string
  recipeId?: string // for subrecipes
  quantity?: number
  measureUnitId?: string
}

export interface GstockRecipe {
  id: string
  name: string
  categoryId?: string
  familyId?: string
  theoreticalCost?: number
  realCost?: number
  description?: string
  allergens?: string[] // array of AllergenType strings if GStock provides them
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
