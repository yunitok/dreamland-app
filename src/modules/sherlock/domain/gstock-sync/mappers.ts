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

function parseAllergenCode(raw: unknown): AllergenType | null {
  if (typeof raw !== "string") return null
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
    ...(raw.reference && { code: raw.reference }),
    ...(raw.nameRegistered && { commercialName: raw.nameRegistered }),
    ...(raw.email && { email: raw.email }),
    ...(raw.phone1 && { phone: raw.phone1 }),
    ...(raw.mobile && { mobile: raw.mobile }),
    ...(raw.contactPerson && { contactPerson: raw.contactPerson }),
    ...(raw.web && { web: raw.web }),
    ...(raw.address && { address: raw.address }),
    ...(raw.cityName && { city: raw.cityName }),
    ...(raw.codePostal && { postalCode: raw.codePostal }),
    ...(raw.province && { province: raw.province }),
    ...(raw.country && { country: raw.country }),
    ...(raw.CIF && { taxId: raw.CIF }),
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

// ─── Ingrediente (depende de categoryMap, unitMap, datos enriquecidos) ────

export interface IngredientEnrichment {
  /** gstockSupplierId → prismaSupplierId */
  supplierMap?: GstockIdMap
  /** gstockProductId → gstockSupplierId (proveedor más reciente por albarán) */
  productSupplierMap?: Map<string, string>
  /** gstockProductId → stock teórico total */
  stockMap?: Map<string, number>
}

export function mapGstockToIngredient(
  raw: GstockProduct,
  unitMap: GstockIdMap,
  categoryMap: GstockIdMap,
  enrichment?: IngredientEnrichment
) {
  // Convertir IDs numéricos a string para lookup en los mapas
  const categoryId = raw.categoryId ? categoryMap.get(String(raw.categoryId)) : undefined
  const unitTypeId = raw.measureUnitId ? unitMap.get(String(raw.measureUnitId)) : undefined

  // FKs requeridas — sin ellas no podemos crear el ingrediente
  if (!categoryId || !unitTypeId) return null

  // Proveedor: productId → gstockSupplierId → prismaSupplierId
  const productId = String(raw.id)
  const gstockSupplierId = enrichment?.productSupplierMap?.get(productId)
  const supplierId = gstockSupplierId ? enrichment?.supplierMap?.get(gstockSupplierId) : undefined

  // Stock teórico del endpoint v1/stockTheoreticals
  const theoreticalStock = enrichment?.stockMap?.get(productId)

  return {
    name: raw.name,
    // GStock product ID (numérico) convertido a string para el campo reference
    reference: String(raw.id),
    categoryId,
    unitTypeId,
    cost: raw.measurePriceAverage ?? raw.measurePriceLastPurchase ?? 0,
    ...(raw.taxRate !== undefined && { taxRate: raw.taxRate }),
    ...(raw.active !== undefined && { status: raw.active ? IngredientStatus.ACTIVE : IngredientStatus.INACTIVE }),
    // Stock: preferir dato de la API directa; si no viene, usar stock teórico
    ...(raw.currentStock != null ? { currentStock: raw.currentStock }
      : theoreticalStock != null ? { currentStock: theoreticalStock } : {}),
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
  familyMap: GstockIdMap,
  fallbackCategoryId?: string
) {
  const categoryId = raw.categoryId
    ? categoryMap.get(String(raw.categoryId))
    : undefined

  // categoryId es requerido en Recipe — usar fallback "Sin clasificar" si no hay match
  const resolvedCategoryId = categoryId ?? fallbackCategoryId
  if (!resolvedCategoryId) return null

  const familyId = raw.familyId ? familyMap.get(String(raw.familyId)) : undefined
  const allergens = (raw.allergens ?? [])
    .map(parseAllergenCode)
    .filter((a): a is AllergenType => a !== null)

  // shortDescription es el campo real de la API v2; description como fallback por retrocompatibilidad
  const description = raw.shortDescription || raw.description

  return {
    name: raw.name,
    categoryId: resolvedCategoryId,
    // GStock recipe ID (numérico) convertido a string para externalId
    externalId: String(raw.id),
    externalSource: "gstock",
    status: raw.active === false ? RecipeStatus.ARCHIVED : RecipeStatus.ACTIVE,
    ...(familyId && { familyId }),
    ...(description && { description }),
    ...(raw.cost !== undefined && { theoreticalCost: raw.cost }),
    ...(allergens.length && { allergens }),
    // elaborations → steps (pasos de elaboración desde GStock V2)
    ...(raw.elaborations?.length && {
      steps: raw.elaborations
        .sort((a, b) => a.position - b.position)
        .map(e => `${e.position}. ${e.description}`),
    }),
    // image → photos[] (campo Prisma String[])
    ...(raw.image && { photos: [raw.image] }),
    // urlInfo → protocoloDeSala (URL a documentación del plato)
    ...(raw.urlInfo && { protocoloDeSala: raw.urlInfo }),
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
  productUnitMap: GstockIdMap
): RecipeIngredientData[] {
  const lines = raw.ingredients ?? []
  const result: RecipeIngredientData[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.productId) continue

    const productIdStr = String(line.productId)
    const ingredientId = ingredientMap.get(productIdStr)
    // La unidad se hereda del producto (measureUnitId), no viene por línea
    const unitId = productUnitMap.get(productIdStr)

    if (!ingredientId || !unitId) continue

    result.push({ ingredientId, quantity: line.quantityMeasure ?? 1, unitId, order: i })
  }

  return result
}
