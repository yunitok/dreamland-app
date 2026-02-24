import { AllergenType, IngredientStatus, RecipeStatus, UnitType } from "@prisma/client"
import type {
  GstockMeasureUnit,
  GstockCategory,
  GstockRecipeCategory,
  GstockRecipeFamily,
  GstockSupplier,
  GstockProduct,
  GstockRecipe,
} from "./types"

// Mapa de GStock ID (string) → Prisma ID (string)
export type GstockIdMap = Map<string, string>

// ─── Helpers ──────────────────────────────────────────────────────

// GStock devuelve IDs como números — siempre convertir a string para usar como clave de mapa o campo Prisma
export const toStr = (id: string | number | null | undefined): string | undefined =>
  id != null ? String(id) : undefined

const VALID_ALLERGENS = new Set<string>(Object.values(AllergenType))

function parseAllergenCode(raw: string): AllergenType | null {
  const code = raw.trim().toUpperCase()
  return VALID_ALLERGENS.has(code) ? (code as AllergenType) : null
}

// Detecta el campo de abreviatura entre los nombres alternativos que puede usar GStock
export function extractAbbreviation(raw: GstockMeasureUnit): string | undefined {
  return (raw.abbreviation ?? raw.abbr ?? raw.symbol ?? raw.shortName) as string | undefined
}

// ─── Entidades de catálogo (sin dependencias FK externas) ─────────

export function mapGstockToMeasureUnit(raw: GstockMeasureUnit, abbreviation: string) {
  return {
    name: raw.name,
    abbreviation,
    type: (raw.type ?? "UNIT") as UnitType,
    gstockId: String(raw.id),
    ...(raw.conversionFactor !== undefined && { conversionFactor: raw.conversionFactor as number }),
    ...(raw.isBase !== undefined && { isBase: raw.isBase as boolean }),
  }
}

export function mapGstockToCategory(raw: GstockCategory, parentIdMap?: GstockIdMap) {
  const parentId = raw.parentId ? parentIdMap?.get(String(raw.parentId)) : undefined
  return {
    name: raw.name,
    gstockId: String(raw.id),
    ...(raw.description && { description: raw.description }),
    ...(parentId && { parentId }),
  }
}

export function mapGstockToRecipeCategory(raw: GstockRecipeCategory) {
  return {
    name: raw.name,
    gstockId: String(raw.id),
    ...(raw.description && { description: raw.description }),
  }
}

export function mapGstockToRecipeFamily(raw: GstockRecipeFamily) {
  return {
    name: raw.name,
    gstockId: String(raw.id),
    ...(raw.description && { description: raw.description }),
  }
}

export function mapGstockToSupplier(raw: GstockSupplier) {
  return {
    name: raw.name,
    gstockId: String(raw.id),
    ...(raw.code && { code: raw.code }),
    ...(raw.commercialName && { commercialName: raw.commercialName }),
    ...(raw.email && { email: raw.email }),
    ...(raw.phone && { phone: raw.phone }),
    ...(raw.mobile && { mobile: raw.mobile }),
    ...(raw.contactPerson && { contactPerson: raw.contactPerson }),
    ...(raw.web && { web: raw.web }),
    ...(raw.address && { address: raw.address }),
    ...(raw.city && { city: raw.city }),
    ...(raw.postalCode && { postalCode: raw.postalCode }),
    ...(raw.province && { province: raw.province }),
    ...(raw.country && { country: raw.country }),
    ...(raw.taxId && { taxId: raw.taxId }),
    ...(raw.paymentTerms && { paymentTerms: raw.paymentTerms }),
    ...(raw.minOrder !== undefined && { minOrder: raw.minOrder }),
    ...(raw.discount !== undefined && { discount: raw.discount }),
    ...(raw.deliveryDays && { deliveryDays: raw.deliveryDays }),
    ...(raw.notes && { notes: raw.notes }),
    ...(raw.active !== undefined && { active: raw.active }),
    ...(raw.categoryName && { categoryName: raw.categoryName }),
    ...(raw.subcategoryName && { subcategoryName: raw.subcategoryName }),
  }
}

// ─── Ingrediente (depende de categoryMap, unitMap, supplierMap) ───

export function mapGstockToIngredient(
  raw: GstockProduct,
  unitMap: GstockIdMap,
  categoryMap: GstockIdMap,
  supplierMap: GstockIdMap
) {
  // Convertir IDs numéricos a string para lookup en los mapas
  const categoryId = raw.categoryId ? categoryMap.get(String(raw.categoryId)) : undefined
  const unitTypeId = raw.measureUnitId ? unitMap.get(String(raw.measureUnitId)) : undefined

  // FKs requeridas — sin ellas no podemos crear el ingrediente
  if (!categoryId || !unitTypeId) return null

  const supplierId = raw.supplierId ? supplierMap.get(String(raw.supplierId)) : undefined

  return {
    name: raw.name,
    // GStock product ID (numérico) convertido a string para el campo reference
    reference: String(raw.id),
    categoryId,
    unitTypeId,
    cost: raw.costPrice ?? 0,
    ...(raw.taxRate !== undefined && { taxRate: raw.taxRate }),
    ...(raw.status && { status: raw.status as IngredientStatus }),
    ...(raw.currentStock !== undefined && { currentStock: raw.currentStock }),
    ...(raw.minStock !== undefined && { minStock: raw.minStock }),
    ...(raw.maxStock !== undefined && { maxStock: raw.maxStock }),
    ...(raw.description && { description: raw.description }),
    ...(supplierId && { supplierId }),
  }
}

// ─── Receta (depende de categoryMap, familyMap) ───────────────────

export function mapGstockToRecipe(
  raw: GstockRecipe,
  categoryMap: GstockIdMap,
  familyMap: GstockIdMap
) {
  const categoryId = raw.categoryId ? categoryMap.get(String(raw.categoryId)) : undefined

  // categoryId es requerido en Recipe
  if (!categoryId) return null

  const familyId = raw.familyId ? familyMap.get(String(raw.familyId)) : undefined
  const allergens = (raw.allergens ?? [])
    .map(parseAllergenCode)
    .filter((a): a is AllergenType => a !== null)

  return {
    name: raw.name,
    categoryId,
    // GStock recipe ID (numérico) convertido a string para externalId
    externalId: String(raw.id),
    externalSource: "gstock",
    status: RecipeStatus.ACTIVE,
    ...(familyId && { familyId }),
    ...(raw.description && { description: raw.description }),
    ...(raw.theoreticalCost !== undefined && { theoreticalCost: raw.theoreticalCost }),
    ...(raw.realCost !== undefined && { realCost: raw.realCost }),
    ...(allergens.length && { allergens }),
  }
}

// ─── Ingredientes de receta (líneas de composición) ──────────────

export interface RecipeIngredientData {
  ingredientId: string
  quantity: number
  unitId: string
  order: number
}

export function mapGstockRecipeIngredients(
  raw: GstockRecipe,
  ingredientMap: GstockIdMap,
  unitMap: GstockIdMap
): RecipeIngredientData[] {
  const lines = raw.ingredients ?? []
  const result: RecipeIngredientData[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.productId) continue

    // IDs numéricos convertidos a string para lookup en los mapas
    const ingredientId = ingredientMap.get(String(line.productId))
    const unitId = line.measureUnitId ? unitMap.get(String(line.measureUnitId)) : undefined

    if (!ingredientId || !unitId) continue

    result.push({ ingredientId, quantity: line.quantity ?? 1, unitId, order: i })
  }

  return result
}
