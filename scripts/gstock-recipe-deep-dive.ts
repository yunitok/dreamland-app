/**
 * GStock Recipe Deep-Dive — Informe exhaustivo de una receta
 *
 * Consulta múltiples endpoints de GStock para generar un informe completo
 * de una receta: ingredientes, proveedores, subrecetas, costes, alérgenos.
 * Compara además las versiones v1 y v2 del endpoint de recetas.
 *
 * Ejecutar:
 *   npx tsx scripts/gstock-recipe-deep-dive.ts "BUTTER CHICKEN"
 *   npx tsx scripts/gstock-recipe-deep-dive.ts --id 260
 */

import "dotenv/config"
import { fetchGstock } from "../src/lib/gstock"
import { inferAllergensForRecipe, mergeAllergens } from "../src/modules/sherlock/domain/gstock-sync/allergen-keywords"
import * as fs from "fs"
import * as path from "path"

// ─── Colores ANSI ────────────────────────────────────────────────
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const MAGENTA = "\x1b[35m"
const WHITE = "\x1b[37m"
const BG_BLUE = "\x1b[44m"

const b = (s: string) => BOLD + s + RESET
const d = (s: string) => DIM + s + RESET
const r = (s: string) => RED + s + RESET
const g = (s: string) => GREEN + s + RESET
const y = (s: string) => YELLOW + s + RESET
const cy = (s: string) => CYAN + s + RESET
const mg = (s: string) => MAGENTA + s + RESET
const header = (s: string) => `${BG_BLUE}${WHITE}${BOLD} ${s} ${RESET}`

// ─── Tipos basados en la respuesta REAL de la API ────────────────

interface ApiResponse<T = unknown> {
  data: T[]
  page?: { rows: number; pages: number }
}

// Línea de ingrediente tal como devuelve GStock (NO usa "quantity" ni "measureUnitId")
interface RawIngredientLine {
  productId?: number
  quantityMeasure?: number    // Cantidad en unidad de medida del producto
  quantityShrinkage?: number  // Merma estimada
  recipeId?: number | null    // null para ingredientes directos, ID para subrecetas
  [k: string]: unknown
}

interface RawRecipe {
  [key: string]: unknown
  id: string | number
  name: string
  subrecipe?: boolean
  version?: number
  recipeParentId?: number | null
  startDate?: string
  endDate?: string | null
  reference?: string
  categoryId?: string | number
  familyId?: string | number
  subrecipeUnitId?: string | number
  quantityUnitSubrecipe?: number
  cost?: number               // Coste total calculado por GStock
  percentageCost?: number
  suggestedPrice?: number
  active?: boolean
  shortDescription?: string
  urlInfo?: string
  image?: string
  creationDate?: string
  modificationDate?: string
  expirationDays?: number | null
  allergens?: string[]
  ingredients?: RawIngredientLine[]
}

// Producto tal como devuelve v1/product/purchases
interface RawProduct {
  [key: string]: unknown
  id: number
  name: string
  reference?: string
  categoryId?: number | null
  familyId?: number | null
  typeId?: number | null
  subtypeId?: number | null
  measureUnitId?: number
  measurePriceLastPurchase?: number
  measurePriceAverage?: number
  displayUnitId?: number
  equivalenceBetweeenMeasureAndDisplay?: number
  active?: boolean
}

// Proveedor tal como devuelve v1/suppliers
interface RawSupplier {
  [key: string]: unknown
  id: string | number
  reference?: string | null
  categoryId?: string | number
  subcategoryId?: string | number
  name: string
  nameRegistered?: string
  CIF?: string
  address?: string | null
  codePostal?: string | null
  cityName?: string | null
  provinceName?: string | null
  countryCode?: string | null
  countryName?: string | null
  phone1?: string | null
  phone2?: string | null
  mobile?: string | null
  email?: string | null
  active?: boolean
}

interface RawUnit {
  [key: string]: unknown
  id: number
  name: string
}

interface RawCategory {
  [key: string]: unknown
  id: string | number
  name: string
}

// Albarán de compra
interface RawDeliveryLine {
  productId?: number
  supplierId?: string | number
  [k: string]: unknown
}

interface RawDelivery {
  [key: string]: unknown
  supplierId?: string | number
  lines?: RawDeliveryLine[]
  products?: Array<{ productId?: number; [k: string]: unknown }>
}

// ─── Argparse ────────────────────────────────────────────────────

const args = process.argv.slice(2)
const idFlag = args.indexOf("--id")
let searchById: string | null = null
let searchByName: string | null = null

if (idFlag !== -1 && args[idFlag + 1]) {
  searchById = args[idFlag + 1]
} else {
  searchByName = args.filter(a => !a.startsWith("--")).join(" ").trim() || null
}

if (!searchById && !searchByName) {
  console.log(r("Uso: npx tsx scripts/gstock-recipe-deep-dive.ts \"BUTTER CHICKEN\""))
  console.log(r("     npx tsx scripts/gstock-recipe-deep-dive.ts --id 260"))
  process.exit(1)
}

// ─── Helpers ─────────────────────────────────────────────────────

function sid(id: string | number | undefined | null): string {
  return id != null ? String(id) : ""
}

function findRecipe(data: RawRecipe[], id: string | null, name: string | null): RawRecipe | undefined {
  if (id) return data.find(r => sid(r.id) === id)
  if (name) {
    const lower = name.toLowerCase()
    return data.find(r => r.name.toLowerCase().includes(lower))
  }
  return undefined
}

function formatEur(n: number | undefined | null): string {
  if (n == null) return "N/A"
  return `${n.toFixed(4)} EUR`
}

function pct(part: number, total: number): string {
  if (!total) return "0%"
  return `${((part / total) * 100).toFixed(1)}%`
}

function line(width = 60): string {
  return "─".repeat(width)
}

function dblLine(width = 60): string {
  return "═".repeat(width)
}

function diffKeys(obj1: Record<string, unknown>, obj2: Record<string, unknown>): { onlyV1: string[]; onlyV2: string[]; shared: string[] } {
  const k1 = new Set(Object.keys(obj1))
  const k2 = new Set(Object.keys(obj2))
  const shared = [...k1].filter(k => k2.has(k))
  const onlyV1 = [...k1].filter(k => !k2.has(k))
  const onlyV2 = [...k2].filter(k => !k1.has(k))
  return { onlyV1, onlyV2, shared }
}

// ─── Fetch seguro (no rompe si un endpoint falla) ────────────────

async function safeFetch<T>(endpoint: string, label: string): Promise<T[]> {
  try {
    const res = await fetchGstock<T>(endpoint) as ApiResponse<T>
    const data = Array.isArray(res.data) ? res.data : (res as unknown as T[]) ?? []
    console.log(g(`  ✓ ${label}`) + d(` (${data.length} registros)`))
    return data
  } catch (e) {
    console.log(r(`  ✗ ${label}: ${e instanceof Error ? e.message : String(e)}`))
    return []
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()

  console.log("")
  console.log(b(dblLine(65)))
  console.log(header("GSTOCK RECIPE DEEP-DIVE"))
  console.log(b(dblLine(65)))
  console.log("")
  console.log(cy("Buscando:") + ` ${searchById ? `ID ${searchById}` : `"${searchByName}"`}`)
  console.log("")

  // ── 1. Fetch paralelo de todos los endpoints ──────────────────

  console.log(b("Fase 1: Obteniendo datos de GStock API..."))
  console.log("")

  const [
    recipesV1,
    recipesV2,
    recipeCategories,
    recipeFamilies,
    products,
    measureUnits,
    displayUnits,
    productTypes,
    productCategories,
    productFamilies,
    suppliers,
    supplierCategories,
    supplierSubcategories,
    subrecipeUnits,
  ] = await Promise.all([
    safeFetch<RawRecipe>("v1/recipes", "v1/recipes"),
    safeFetch<RawRecipe>("v2/recipes", "v2/recipes"),
    safeFetch<RawCategory>("v1/recipes/categories", "v1/recipes/categories"),
    safeFetch<RawCategory>("v1/recipes/families", "v1/recipes/families"),
    safeFetch<RawProduct>("v1/product/purchases", "v1/product/purchases"),
    safeFetch<RawUnit>("v1/product/purchases/units/measure", "v1/units/measure"),
    safeFetch<RawUnit>("v1/product/purchases/units/display", "v1/units/display"),
    safeFetch<Record<string, unknown>>("v1/product/purchases/types", "v1/product/types"),
    safeFetch<RawCategory>("v1/product/purchases/categories", "v1/product/categories"),
    safeFetch<RawCategory>("v1/product/purchases/families", "v1/product/families"),
    safeFetch<RawSupplier>("v1/suppliers", "v1/suppliers"),
    safeFetch<RawCategory>("v1/suppliers/category", "v1/suppliers/category"),
    safeFetch<RawCategory>("v1/suppliers/subcategory", "v1/suppliers/subcategory"),
    safeFetch<RawUnit>("v1/subrecipes/units", "v1/subrecipes/units"),
  ])

  // Intentar obtener pedidos de compra para vincular producto↔proveedor
  const orders = await safeFetch<Record<string, unknown>>("v1/order/purchases", "v1/order/purchases")

  console.log("")

  // ── 2. Localizar receta en v1 y v2 ────────────────────────────

  const recipeV1 = findRecipe(recipesV1, searchById, searchByName)
  const recipeV2 = findRecipe(recipesV2, searchById, searchByName)

  if (!recipeV1 && !recipeV2) {
    console.log(r(`No se encontró la receta ${searchById ? `con ID ${searchById}` : `"${searchByName}"`} en ninguno de los endpoints.`))
    console.log(d(`Total recetas v1: ${recipesV1.length}, v2: ${recipesV2.length}`))
    if (searchByName) {
      const matches = recipesV2
        .filter(r => r.name.toLowerCase().includes((searchByName ?? "").toLowerCase().substring(0, 5)))
        .map(r => `  - ${r.name} (ID: ${r.id})`)
        .slice(0, 10)
      if (matches.length) {
        console.log(y("\nRecetas similares encontradas:"))
        matches.forEach(m => console.log(m))
      }
    }
    process.exit(1)
  }

  const recipe = recipeV2 ?? recipeV1!
  const recipeName = recipe.name

  console.log(g(`Receta encontrada: "${recipeName}" (ID: ${recipe.id})`))
  console.log("")

  // ── Lookup maps ───────────────────────────────────────────────

  const productMap = new Map(products.map(p => [String(p.id), p]))
  const measureUnitMap = new Map(measureUnits.map(u => [String(u.id), u]))
  const displayUnitMap = new Map(displayUnits.map(u => [String(u.id), u]))
  const supplierMap = new Map(suppliers.map(s => [sid(s.id), s]))
  const recipeCatMap = new Map(recipeCategories.map(c => [sid(c.id), c]))
  const recipeFamMap = new Map(recipeFamilies.map(f => [sid(f.id), f]))
  const productCatMap = new Map(productCategories.map(c => [sid(c.id), c.name]))
  const productFamMap = new Map(productFamilies.map(f => [sid(f.id), f.name]))
  const productTypeMap = new Map((productTypes as any[]).map(t => [String(t.id), t.name as string]))
  const supplierCatMap = new Map(supplierCategories.map(c => [sid(c.id), c.name]))
  const supplierSubcatMap = new Map(supplierSubcategories.map(s => [sid(s.id), s.name]))
  const allRecipesV2Map = new Map(recipesV2.map(r => [sid(r.id), r]))

  // Intentar construir mapa producto → proveedor desde pedidos de compra
  const productSupplierMap = new Map<string, string>()  // productId → supplierId
  for (const order of orders) {
    const suppId = sid(order.supplierId as string | number | undefined)
    const lines = (order.lines ?? order.products ?? order.items ?? []) as Array<Record<string, unknown>>
    if (suppId && Array.isArray(lines)) {
      for (const line of lines) {
        const prodId = line.productId ?? line.product_id
        if (prodId) productSupplierMap.set(String(prodId), suppId)
      }
    }
  }
  if (productSupplierMap.size) {
    console.log(g(`  Mapa producto→proveedor: ${productSupplierMap.size} relaciones extraídas de pedidos`))
  }

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 1: COMPARATIVA v1 vs v2
  // ══════════════════════════════════════════════════════════════

  console.log("")
  console.log(b(dblLine(65)))
  console.log(header("1. COMPARATIVA v1 vs v2"))
  console.log(b(dblLine(65)))
  console.log("")

  if (recipeV1 && recipeV2) {
    const diff = diffKeys(recipeV1 as Record<string, unknown>, recipeV2 as Record<string, unknown>)
    console.log(cy("Campos exclusivos de v1:") + ` ${diff.onlyV1.length ? diff.onlyV1.join(", ") : "(ninguno)"}`)
    console.log(mg("Campos exclusivos de v2:") + ` ${diff.onlyV2.length ? diff.onlyV2.join(", ") : "(ninguno)"}`)
    console.log(cy("Campos compartidos:") + ` ${diff.shared.join(", ")}`)
    console.log("")

    // Comparar valores de campos compartidos
    const valuesDiff: string[] = []
    for (const key of diff.shared) {
      const v1Val = JSON.stringify(recipeV1[key])
      const v2Val = JSON.stringify(recipeV2[key])
      if (v1Val !== v2Val) valuesDiff.push(key)
    }
    if (valuesDiff.length) {
      console.log(y("Campos con valores diferentes entre v1 y v2:"))
      for (const key of valuesDiff) {
        console.log(`  ${b(key)}:`)
        console.log(`    v1: ${d(JSON.stringify(recipeV1[key], null, 0)?.substring(0, 200) ?? "undefined")}`)
        console.log(`    v2: ${d(JSON.stringify(recipeV2[key], null, 0)?.substring(0, 200) ?? "undefined")}`)
      }
    } else {
      console.log(g("Todos los campos compartidos tienen valores idénticos."))
    }

    console.log("")
    console.log(b("CONCLUSIÓN:"))
    if (diff.onlyV2.length && !diff.onlyV1.length) {
      console.log(g(`  v2 es SUPERSET de v1. Añade: ${diff.onlyV2.join(", ")}`))
      console.log(g("  → Usar v2/recipes en producción (v1 puede considerarse deprecated)."))
    } else if (diff.onlyV1.length) {
      console.log(y(`  v1 tiene campos exclusivos: ${diff.onlyV1.join(", ")}`))
      console.log(y("  → Evaluar caso por caso."))
    } else {
      console.log(d("  Ambos endpoints son idénticos."))
    }

    console.log("")
    console.log(d(`Total campos v1: ${Object.keys(recipeV1).length} | Total campos v2: ${Object.keys(recipeV2).length}`))
    console.log(d(`Total recetas v1: ${recipesV1.length} | Total recetas v2: ${recipesV2.length}`))
  } else {
    console.log(y(recipeV1 ? "Solo encontrada en v1" : "Solo encontrada en v2"))
  }

  console.log("")

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 2: FICHA COMPLETA
  // ══════════════════════════════════════════════════════════════

  console.log(b(dblLine(65)))
  console.log(header("2. FICHA COMPLETA DE LA RECETA"))
  console.log(b(dblLine(65)))
  console.log("")

  const category = recipe.categoryId ? recipeCatMap.get(sid(recipe.categoryId)) : null
  const family = recipe.familyId ? recipeFamMap.get(sid(recipe.familyId)) : null

  // Imprimir todos los campos escalares
  const scalarFields = Object.entries(recipe).filter(([k]) => k !== "ingredients" && k !== "subrecipes")
  for (const [key, value] of scalarFields) {
    const display = value === null ? d("null") :
      value === "" ? d('""') :
        typeof value === "object" ? JSON.stringify(value) :
          String(value)
    console.log(`  ${cy(key.padEnd(36))} ${display}`)
  }

  // Resolver nombres de categoría/familia
  if (category) console.log(`  ${mg("→ categoryName".padEnd(36))} ${category.name}`)
  else if (recipe.categoryId) console.log(`  ${r("→ categoryName".padEnd(36))} (no encontrada para ID ${recipe.categoryId})`)

  if (family) console.log(`  ${mg("→ familyName".padEnd(36))} ${family.name}`)
  else if (recipe.familyId) console.log(`  ${r("→ familyName".padEnd(36))} (no encontrada para ID ${recipe.familyId})`)

  // Alérgenos inferidos
  const ingredientProductNames = (recipe.ingredients ?? [])
    .filter(l => l.productId)
    .map(l => productMap.get(String(l.productId!))?.name ?? "")
    .filter(Boolean)
  const inferredAllergens = inferAllergensForRecipe(ingredientProductNames)
  const recipeAllergens = Array.isArray(recipe.allergens) ? recipe.allergens as string[] : []
  const allAllergens = mergeAllergens(recipeAllergens as never[], inferredAllergens)

  console.log("")
  console.log(cy("  Alérgenos GStock:") + `    ${recipeAllergens.length ? recipeAllergens.join(", ") : "ninguno declarado"}`)
  console.log(cy("  Alérgenos inferidos:") + ` ${inferredAllergens.length ? inferredAllergens.join(", ") : "ninguno"}`)
  console.log(b("  Alérgenos totales:") + `   ${allAllergens.length ? y(allAllergens.join(", ")) : g("ninguno")}`)

  console.log("")

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 3: INGREDIENTES
  // ══════════════════════════════════════════════════════════════

  console.log(b(dblLine(65)))
  console.log(header("3. INGREDIENTES"))
  console.log(b(dblLine(65)))
  console.log("")

  const ingredientLines = recipe.ingredients ?? []

  interface ResolvedIngredient {
    product: RawProduct | undefined
    quantity: number
    shrinkage: number
    unitName: string
    unitCost: number
    lineCost: number
    supplierName: string
    supplierId: string
    line: RawIngredientLine
  }

  const resolvedIngredients: ResolvedIngredient[] = []

  if (!ingredientLines.length) {
    console.log(y("  Sin ingredientes registrados en la receta."))
  } else {
    // Header de tabla
    const colW = [3, 32, 10, 6, 12, 10, 12]
    const headers = ["#", "Ingrediente", "Cantidad", "Ud.", "Coste/Ud", "Merma", "Coste línea"]
    console.log("  " + headers.map((h, i) => b(h.padEnd(colW[i]))).join(" "))
    console.log("  " + line(colW.reduce((a, b) => a + b + colW.length - 1, 0)))

    let totalCost = 0

    for (let i = 0; i < ingredientLines.length; i++) {
      const il = ingredientLines[i]
      const product = il.productId ? productMap.get(String(il.productId)) : undefined
      const qty = il.quantityMeasure ?? 0
      const shrinkage = il.quantityShrinkage ?? 0
      const unitName = product?.measureUnitId ? (measureUnitMap.get(String(product.measureUnitId))?.name ?? "?") : "?"
      const unitCost = product?.measurePriceLastPurchase ?? product?.measurePriceAverage ?? 0
      const lineCost = unitCost * qty

      // Buscar proveedor (desde pedidos de compra si disponible)
      const suppId = il.productId ? productSupplierMap.get(String(il.productId)) : undefined
      const supplier = suppId ? supplierMap.get(suppId) : undefined

      resolvedIngredients.push({
        product,
        quantity: qty,
        shrinkage,
        unitName,
        unitCost,
        lineCost,
        supplierName: supplier?.name ?? "",
        supplierId: suppId ?? "",
        line: il,
      })

      totalCost += lineCost

      const cols = [
        String(i + 1).padEnd(colW[0]),
        (product?.name ?? `ProdID:${il.productId}`).substring(0, colW[1]).padEnd(colW[1]),
        qty.toFixed(3).padEnd(colW[2]),
        unitName.padEnd(colW[3]),
        formatEur(unitCost).padEnd(colW[4]),
        shrinkage ? y(shrinkage.toFixed(3)) + " ".repeat(Math.max(0, colW[5] - shrinkage.toFixed(3).length)) : d("0".padEnd(colW[5])),
        formatEur(lineCost).padEnd(colW[6]),
      ]
      console.log("  " + cols.join(" "))
    }

    console.log("  " + line(colW.reduce((a, b) => a + b + colW.length - 1, 0)))
    console.log(`  ${b("Coste calculado (Σ cant × precio/ud):")} ${b(formatEur(totalCost))}`)
    console.log(`  ${cy("Coste según GStock (recipe.cost):")}     ${formatEur(recipe.cost)}`)

    if (recipe.cost && totalCost) {
      const diff = totalCost - recipe.cost
      const color = Math.abs(diff) < 0.01 ? g : y
      console.log(`  ${cy("Diferencia:")}                          ${color(formatEur(diff))}`)
    }
  }

  console.log("")

  // Detalle expandido de cada ingrediente (producto completo)
  if (resolvedIngredients.length) {
    console.log(b("  Detalle de productos:"))
    console.log("")
    for (const ri of resolvedIngredients) {
      if (!ri.product) continue
      const p = ri.product
      const catName = p.categoryId ? productCatMap.get(String(p.categoryId)) : undefined
      const famName = p.familyId ? productFamMap.get(String(p.familyId)) : undefined
      const typeName = p.typeId ? productTypeMap.get(String(p.typeId)) : undefined
      const displayUnit = p.displayUnitId ? displayUnitMap.get(String(p.displayUnitId)) : undefined

      console.log(`  ${cy("•")} ${b(p.name)} ${d(`(ID: ${p.id}, ref: ${p.reference ?? "N/A"})`)}`)
      console.log(`    Categoría: ${catName ?? d("N/A")} | Familia: ${famName ?? d("N/A")} | Tipo: ${typeName ?? d("N/A")}`)
      console.log(`    Precio último albarán: ${formatEur(p.measurePriceLastPurchase)} | Precio medio: ${formatEur(p.measurePriceAverage)}`)
      console.log(`    Ud. medida: ${ri.unitName} (ID: ${p.measureUnitId}) | Ud. display: ${displayUnit?.name ?? `ID:${p.displayUnitId}`}`)
      console.log(`    Activo: ${p.active ? g("sí") : r("no")} | Creado: ${p.creationDate ?? "?"} | Modificado: ${p.modificationDate ?? "?"}`)
      if (ri.supplierName) console.log(`    Proveedor: ${mg(ri.supplierName)} (ID: ${ri.supplierId})`)
      console.log("")
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 4: PROVEEDORES
  // ══════════════════════════════════════════════════════════════

  console.log(b(dblLine(65)))
  console.log(header("4. PROVEEDORES"))
  console.log(b(dblLine(65)))
  console.log("")

  // Primero: proveedores vinculados desde pedidos
  const linkedSuppliers = new Map<string, { supplier: RawSupplier; products: string[] }>()
  for (const ri of resolvedIngredients) {
    if (ri.supplierId && ri.supplierName) {
      if (!linkedSuppliers.has(ri.supplierId)) {
        linkedSuppliers.set(ri.supplierId, { supplier: supplierMap.get(ri.supplierId)!, products: [] })
      }
      linkedSuppliers.get(ri.supplierId)!.products.push(ri.product?.name ?? "?")
    }
  }

  if (linkedSuppliers.size) {
    console.log(g(`  ${linkedSuppliers.size} proveedor(es) vinculado(s) a los ingredientes (vía pedidos de compra):`))
    console.log("")
    printSuppliers(linkedSuppliers, supplierCatMap, supplierSubcatMap)
  } else {
    console.log(y("  No se encontró vínculo directo producto→proveedor en la API."))
    console.log(d("  GStock no expone supplierId en v1/product/purchases."))
    console.log(d("  La relación se establece a través de pedidos/albaranes de compra."))

    if (!orders.length) {
      console.log(y("\n  El endpoint v1/order/purchases no devolvió datos (posible requerimiento de parámetros)."))
    }

    // Mostrar todos los proveedores como referencia
    console.log("")
    console.log(b("  Listado completo de proveedores en GStock (para referencia):"))
    console.log("")
    for (const sup of suppliers.filter(s => s.active)) {
      const catName = sup.categoryId ? supplierCatMap.get(sid(sup.categoryId)) : undefined
      console.log(`    ${cy(sid(sup.id).padEnd(4))} ${sup.name.padEnd(25)} ${(sup.nameRegistered ?? "").padEnd(35)} ${sup.CIF ?? ""} ${catName ? d(`[${catName}]`) : ""}`)
    }
  }

  console.log("")

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 5: SUBRECETAS / ELABORACIONES
  // ══════════════════════════════════════════════════════════════

  console.log(b(dblLine(65)))
  console.log(header("5. SUBRECETAS / ELABORACIONES"))
  console.log(b(dblLine(65)))
  console.log("")

  // Las subrecetas en GStock se modelan como recetas con subrecipe=true
  // y se referencian desde recipe.ingredients con recipeId != null
  // O como recipe.subrecipes[] (si el endpoint lo devuelve)

  // Comprobar ambas fuentes
  const subrecipeFromIngredients = ingredientLines.filter(l => l.recipeId != null)
  const subrecipesDirect = recipe.subrecipes ?? []

  // También buscar recetas hijas (recipeParentId == recipe.id)
  const childRecipes = recipesV2.filter(r => sid(r.recipeParentId as number | null) === sid(recipe.id))

  // También buscar si esta receta es subreceta (subrecipe=true) o tiene subrecipeUnitId
  const isSubrecipe = recipe.subrecipe === true
  const parentRecipe = recipe.recipeParentId ? allRecipesV2Map.get(sid(recipe.recipeParentId)) : undefined

  if (isSubrecipe) {
    console.log(mg("  Esta receta está marcada como SUBRECETA (subrecipe=true)"))
    if (parentRecipe) console.log(`  Receta padre: ${b(parentRecipe.name)} (ID: ${parentRecipe.id})`)
    console.log("")
  }

  const hasSubrecipes = subrecipeFromIngredients.length || subrecipesDirect.length || childRecipes.length

  if (!hasSubrecipes) {
    console.log(y("  Sin subrecetas asociadas directamente."))
    console.log("")

    // Buscar recetas que podrían ser elaboraciones (productos que son también recetas)
    const productRecipeOverlap: Array<{ product: RawProduct; recipe: RawRecipe }> = []
    for (const ri of resolvedIngredients) {
      if (!ri.product) continue
      // Buscar si el nombre del producto coincide con alguna receta
      const matchingRecipe = recipesV2.find(r =>
        r.name.toLowerCase() === ri.product!.name.toLowerCase() ||
        r.name.toLowerCase().includes(ri.product!.name.toLowerCase()) ||
        ri.product!.name.toLowerCase().includes(r.name.toLowerCase())
      )
      if (matchingRecipe && sid(matchingRecipe.id) !== sid(recipe.id)) {
        productRecipeOverlap.push({ product: ri.product, recipe: matchingRecipe })
      }
    }

    if (productRecipeOverlap.length) {
      console.log(mg("  Ingredientes que coinciden con recetas existentes (posibles elaboraciones):"))
      for (const { product: prod, recipe: rec } of productRecipeOverlap) {
        console.log(`    ${cy("•")} Producto "${b(prod.name)}" (ID: ${prod.id}) ↔ Receta "${b(rec.name)}" (ID: ${rec.id})`)
        const childIngredients = rec.ingredients ?? []
        if (childIngredients.length) {
          console.log(`      Ingredientes de la elaboración:`)
          for (const ci of childIngredients) {
            const p = ci.productId ? productMap.get(String(ci.productId)) : undefined
            const uName = p?.measureUnitId ? (measureUnitMap.get(String(p.measureUnitId))?.name ?? "?") : "?"
            console.log(`        - ${p?.name ?? `ID:${ci.productId}`} (${ci.quantityMeasure ?? "?"} ${uName})`)
          }
        }
        if (rec.cost != null) console.log(`      Coste: ${formatEur(rec.cost)}`)
        console.log("")
      }
    }
  } else {
    // Subrecetas desde ingredientes con recipeId
    if (subrecipeFromIngredients.length) {
      console.log(cy("  Subrecetas referenciadas desde ingredientes:"))
      for (const sl of subrecipeFromIngredients) {
        const child = sl.recipeId ? allRecipesV2Map.get(sid(sl.recipeId)) : undefined
        printSubrecipe(child, sl, productMap, measureUnitMap, supplierMap, productSupplierMap)
      }
    }

    // Subrecetas directas
    if (subrecipesDirect.length) {
      console.log(cy("  Subrecetas directas (recipe.subrecipes):"))
      for (const sl of subrecipesDirect) {
        const child = sl.recipeId ? allRecipesV2Map.get(sid(sl.recipeId)) : undefined
        printSubrecipe(child, sl as RawIngredientLine, productMap, measureUnitMap, supplierMap, productSupplierMap)
      }
    }

    // Recetas hijas
    if (childRecipes.length) {
      console.log(cy("  Recetas hijas (recipeParentId apunta a esta receta):"))
      for (const child of childRecipes) {
        console.log(`    ${mg("•")} ${b(child.name)} (ID: ${child.id})`)
        console.log(`      Coste: ${formatEur(child.cost)} | Subreceta: ${child.subrecipe} | Activa: ${child.active}`)
      }
    }
  }

  console.log("")

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 6: ANÁLISIS DE COSTES
  // ══════════════════════════════════════════════════════════════

  console.log(b(dblLine(65)))
  console.log(header("6. ANÁLISIS DE COSTES"))
  console.log(b(dblLine(65)))
  console.log("")

  const gstockCost = recipe.cost as number | undefined

  if (gstockCost != null) {
    console.log(`  ${cy("Coste GStock (recipe.cost):")}    ${b(formatEur(gstockCost))}`)
    console.log(`  ${cy("Precio sugerido:")}              ${formatEur(recipe.suggestedPrice as number | undefined)}`)
    console.log(`  ${cy("% Coste:")}                      ${recipe.percentageCost ?? "N/A"}%`)
    console.log("")
  }

  // Desglose por ingrediente
  if (resolvedIngredients.length) {
    let totalIngCost = 0
    const costBreakdown: Array<{ name: string; qty: number; unitCost: number; cost: number; pct: string; shrinkageCost: number }> = []

    for (const ri of resolvedIngredients) {
      const shrinkageCost = ri.unitCost * ri.shrinkage
      totalIngCost += ri.lineCost
      costBreakdown.push({
        name: ri.product?.name ?? "?",
        qty: ri.quantity,
        unitCost: ri.unitCost,
        cost: ri.lineCost,
        pct: "",
        shrinkageCost,
      })
    }

    for (const item of costBreakdown) {
      item.pct = pct(item.cost, totalIngCost)
    }

    costBreakdown.sort((a, b) => b.cost - a.cost)

    console.log(b("  Desglose de coste por ingrediente:"))
    console.log("")
    console.log("  " + b("Ingrediente".padEnd(32)) + b("Cant.".padEnd(8)) + b("€/Ud".padEnd(12)) + b("Coste".padEnd(14)) + b("% Total".padEnd(8)) + b("Merma €"))
    console.log("  " + line(90))

    for (const item of costBreakdown) {
      const bar = "█".repeat(Math.max(1, Math.round(parseFloat(item.pct) / 3)))
      const mermaStr = item.shrinkageCost > 0 ? y(formatEur(item.shrinkageCost)) : d("0")
      console.log(
        `  ${item.name.padEnd(32)} ${item.qty.toFixed(3).padEnd(8)} ${formatEur(item.unitCost).padEnd(12)} ${formatEur(item.cost).padEnd(14)} ${item.pct.padStart(6)}  ${cy(bar)} ${mermaStr}`
      )
    }
    console.log("  " + line(90))
    console.log(`  ${"TOTAL".padEnd(52)} ${b(formatEur(totalIngCost))}`)

    // Coste con merma incluida
    const totalShrinkageCost = costBreakdown.reduce((a, b) => a + b.shrinkageCost, 0)
    if (totalShrinkageCost > 0) {
      console.log(`  ${"TOTAL CON MERMA".padEnd(52)} ${y(formatEur(totalIngCost + totalShrinkageCost))}`)
    }

    // Comparar con coste GStock
    if (gstockCost != null) {
      console.log("")
      console.log(b("  Reconciliación de costes:"))
      console.log(`    Coste calculado (cant × precio): ${formatEur(totalIngCost)}`)
      console.log(`    Coste GStock (recipe.cost):      ${formatEur(gstockCost)}`)
      const diff = totalIngCost - gstockCost
      const color = Math.abs(diff) < 0.01 ? g : Math.abs(diff) < 0.1 ? y : r
      console.log(`    Diferencia:                      ${color(formatEur(diff))}`)
      if (Math.abs(diff) > 0.01) {
        console.log(d("    (Puede deberse a que GStock usa promedios ponderados o incluye merma)"))
      }
    }
  }

  console.log("")

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 7: DATOS ADICIONALES
  // ══════════════════════════════════════════════════════════════

  console.log(b(dblLine(65)))
  console.log(header("7. DATOS ADICIONALES"))
  console.log(b(dblLine(65)))
  console.log("")

  // Unidades de subreceta
  if (subrecipeUnits.length) {
    console.log(cy("  Unidades de subreceta:"))
    for (const u of subrecipeUnits) {
      console.log(`    ${sid(u.id).padEnd(4)} ${u.name}`)
    }
    console.log("")
  }

  // Catálogos de recetas
  console.log(cy("  Categorías de recetas:"))
  for (const c of recipeCategories) {
    console.log(`    ${sid(c.id).padEnd(4)} ${c.name}`)
  }
  console.log(cy("\n  Familias de recetas:"))
  for (const f of recipeFamilies) {
    console.log(`    ${sid(f.id).padEnd(4)} ${f.name}`)
  }

  // Estadísticas
  console.log(cy("\n  Estadísticas generales GStock:"))
  console.log(`    Total recetas v1: ${recipesV1.length} | v2: ${recipesV2.length}`)
  console.log(`    Recetas activas: ${recipesV2.filter(r => r.active).length} | Subrecetas: ${recipesV2.filter(r => r.subrecipe).length}`)
  console.log(`    Total productos de compra: ${products.length} (activos: ${products.filter(p => p.active).length})`)
  console.log(`    Total proveedores: ${suppliers.length} (activos: ${suppliers.filter(s => s.active).length})`)
  console.log(`    Unidades de medida: ${measureUnits.length} | Display: ${displayUnits.length}`)
  console.log(`    Categorías de recetas: ${recipeCategories.length} | Familias: ${recipeFamilies.length}`)
  console.log(`    Categorías de productos: ${productCategories.length} | Familias prod.: ${productFamilies.length}`)
  console.log(`    Tipos de producto: ${productTypes.length}`)

  // Recetas con coste más alto y más bajo
  const recipesWithCost = recipesV2.filter(r => r.cost != null && (r.cost as number) > 0).sort((a, b) => (b.cost as number) - (a.cost as number))
  if (recipesWithCost.length) {
    console.log(cy("\n  Top 5 recetas más costosas:"))
    for (const r of recipesWithCost.slice(0, 5)) {
      console.log(`    ${formatEur(r.cost).padEnd(16)} ${r.name}`)
    }
  }

  console.log("")

  // RAW dump
  console.log(b(dblLine(65)))
  console.log(header("RAW: RECETA v1"))
  console.log(b(dblLine(65)))
  console.log(recipeV1 ? JSON.stringify(recipeV1, null, 2) : y("  No encontrada en v1"))
  console.log("")

  console.log(b(dblLine(65)))
  console.log(header("RAW: RECETA v2"))
  console.log(b(dblLine(65)))
  console.log(recipeV2 ? JSON.stringify(recipeV2, null, 2) : y("  No encontrada en v2"))

  // Muestra de un pedido de compra (si hay) para entender estructura
  if (orders.length) {
    console.log("")
    console.log(b(dblLine(65)))
    console.log(header("RAW: PEDIDO DE COMPRA (muestra)"))
    console.log(b(dblLine(65)))
    console.log(JSON.stringify(orders[0], null, 2).substring(0, 2000))
  }

  // ── Exportar JSON ─────────────────────────────────────────────

  const outputDir = path.join(__dirname, "output")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const jsonReport = {
    meta: {
      generatedAt: new Date().toISOString(),
      searchQuery: searchById ? { id: searchById } : { name: searchByName },
      durationMs: Date.now() - startTime,
    },
    comparison: {
      v1Found: !!recipeV1,
      v2Found: !!recipeV2,
      v1FieldCount: recipeV1 ? Object.keys(recipeV1).length : 0,
      v2FieldCount: recipeV2 ? Object.keys(recipeV2).length : 0,
      diff: recipeV1 && recipeV2 ? diffKeys(recipeV1 as Record<string, unknown>, recipeV2 as Record<string, unknown>) : null,
      conclusion: "v2 es superset de v1, añade campo 'allergens'. Usar v2 en producción.",
      totalRecipesV1: recipesV1.length,
      totalRecipesV2: recipesV2.length,
    },
    recipe: {
      v1: recipeV1 ?? null,
      v2: recipeV2 ?? null,
      category: category ? { id: category.id, name: category.name } : null,
      family: family ? { id: family.id, name: family.name } : null,
      allergens: {
        fromGstock: recipeAllergens,
        inferred: inferredAllergens,
        merged: allAllergens,
      },
    },
    ingredients: resolvedIngredients.map(ri => ({
      line: ri.line,
      product: ri.product ?? null,
      unitName: ri.unitName,
      quantity: ri.quantity,
      shrinkage: ri.shrinkage,
      unitCost: ri.unitCost,
      lineCost: ri.lineCost,
      supplierName: ri.supplierName || null,
      supplierId: ri.supplierId || null,
    })),
    suppliers: [...linkedSuppliers.values()].map(({ supplier: s, products: p }) => ({
      ...s,
      categoryName: s.categoryId ? supplierCatMap.get(sid(s.categoryId)) : null,
      subcategoryName: s.subcategoryId ? supplierSubcatMap.get(sid(s.subcategoryId)) : null,
      productsInRecipe: p,
    })),
    allSuppliersList: suppliers.filter(s => s.active).map(s => ({
      id: s.id,
      name: s.name,
      nameRegistered: s.nameRegistered,
      CIF: s.CIF,
      phone1: s.phone1,
      categoryName: s.categoryId ? supplierCatMap.get(sid(s.categoryId)) : null,
    })),
    subrecipes: {
      fromIngredients: ingredientLines.filter(l => l.recipeId != null),
      direct: recipe.subrecipes ?? [],
      childRecipes: childRecipes.map(r => ({ id: r.id, name: r.name, cost: r.cost, subrecipe: r.subrecipe })),
    },
    costs: {
      gstockCost: gstockCost ?? null,
      calculatedCost: resolvedIngredients.reduce((a, b) => a + b.lineCost, 0),
      suggestedPrice: recipe.suggestedPrice ?? null,
      percentageCost: recipe.percentageCost ?? null,
    },
    catalogs: {
      recipeCategories,
      recipeFamilies,
      subrecipeUnits,
      measureUnits,
      productCategories: productCategories.slice(0, 10),
      totalProducts: products.length,
      totalSuppliers: suppliers.length,
      totalOrders: orders.length,
    },
    fieldDiscovery: {
      note: "Campos reales de la API (vs tipos definidos en el código)",
      recipeFields: recipeV2 ? Object.keys(recipeV2) : [],
      ingredientLineFields: ingredientLines[0] ? Object.keys(ingredientLines[0]) : [],
      productFields: products[0] ? Object.keys(products[0]) : [],
      supplierFields: suppliers[0] ? Object.keys(suppliers[0]) : [],
    },
  }

  const outputPath = path.join(outputDir, "gstock-recipe-report.json")
  fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2), "utf-8")

  console.log("")
  console.log(b(dblLine(65)))
  console.log(g(`JSON exportado: ${outputPath}`))
  console.log(d(`Duración total: ${((Date.now() - startTime) / 1000).toFixed(1)}s`))
  console.log(b(dblLine(65)))
}

// ─── Helpers de impresión ────────────────────────────────────────

function printSuppliers(
  suppliers: Map<string, { supplier: RawSupplier; products: string[] }>,
  catMap: Map<string, string>,
  subcatMap: Map<string, string>
) {
  let idx = 0
  for (const [, { supplier: sup, products: prods }] of suppliers) {
    idx++
    const catName = sup.categoryId ? catMap.get(sid(sup.categoryId)) : undefined
    const subcatName = sup.subcategoryId ? subcatMap.get(sid(sup.subcategoryId)) : undefined

    console.log(mg(`  ┌─ Proveedor ${idx}: ${b(sup.name)}`))
    console.log(`  │  ${cy("ID:")}                ${sup.id}`)
    if (sup.nameRegistered) console.log(`  │  ${cy("Razón social:")}     ${sup.nameRegistered}`)
    if (sup.CIF) console.log(`  │  ${cy("CIF:")}               ${sup.CIF}`)
    if (sup.email) console.log(`  │  ${cy("Email:")}             ${sup.email}`)
    if (sup.phone1) console.log(`  │  ${cy("Teléfono:")}          ${sup.phone1}`)
    if (sup.address) console.log(`  │  ${cy("Dirección:")}         ${sup.address}`)
    if (sup.cityName) console.log(`  │  ${cy("Ciudad:")}            ${sup.cityName}`)
    if (sup.provinceName) console.log(`  │  ${cy("Provincia:")}         ${sup.provinceName}`)
    if (sup.countryName) console.log(`  │  ${cy("País:")}              ${sup.countryName}`)
    if (catName) console.log(`  │  ${cy("Categoría:")}         ${catName}`)
    if (subcatName) console.log(`  │  ${cy("Subcategoría:")}      ${subcatName}`)
    console.log(`  │  ${cy("Productos:")}         ${prods.join(", ")}`)
    console.log(`  └${"─".repeat(55)}`)
    console.log("")
  }
}

function printSubrecipe(
  child: RawRecipe | undefined,
  sl: RawIngredientLine,
  productMap: Map<string, RawProduct>,
  unitMap: Map<string, RawUnit>,
  supplierMap: Map<string, RawSupplier>,
  productSupplierMap: Map<string, string>
) {
  console.log(mg(`    ┌─ ${b(child?.name ?? `RecetaID:${sl.recipeId}`)}`))
  console.log(`    │  ID: ${sl.recipeId} | Cantidad: ${sl.quantityMeasure ?? sl.quantity ?? "N/A"}`)

  if (child) {
    const childIngs = child.ingredients ?? []
    if (childIngs.length) {
      console.log(`    │  ${cy("Ingredientes:")}`)
      for (const ci of childIngs) {
        const prod = ci.productId ? productMap.get(String(ci.productId)) : undefined
        const uName = prod?.measureUnitId ? (unitMap.get(String(prod.measureUnitId))?.name ?? "?") : "?"
        const supId = ci.productId ? productSupplierMap.get(String(ci.productId)) : undefined
        const sup = supId ? supplierMap.get(supId) : undefined
        console.log(`    │    - ${prod?.name ?? `ID:${ci.productId}`} (${ci.quantityMeasure ?? "?"} ${uName})${sup ? ` [${sup.name}]` : ""}`)
      }
    }
    if (child.cost != null) console.log(`    │  Coste: ${formatEur(child.cost)}`)
  }
  console.log(`    └${"─".repeat(50)}`)
  console.log("")
}

main().catch(err => {
  console.error(r(`Error fatal: ${err instanceof Error ? err.message : String(err)}`))
  process.exit(1)
})
