import { prisma } from "@/lib/prisma"
import { fetchGstock } from "@/lib/gstock"
import { inferAllergensForRecipe, mergeAllergens } from "./allergen-keywords"
import {
  mapGstockToMeasureUnit,
  mapGstockToCategory,
  mapGstockToRecipeCategory,
  mapGstockToRecipeFamily,
  mapGstockToSupplier,
  mapGstockToIngredient,
  mapGstockToRecipe,
  mapGstockRecipeIngredients,
  extractAbbreviation,
  type GstockIdMap,
  type IngredientEnrichment,
} from "./mappers"
import { generateRecipeKBEntries } from "./kb-generator"
import { syncKBBySourceCore } from "@/modules/rag/actions/knowledge-base-core"
import "@/modules/rag/domain/register-domains"
import type {
  GstockMeasureUnit,
  GstockCategory,
  GstockRecipeCategory,
  GstockRecipeFamily,
  GstockSupplier,
  GstockProduct,
  GstockRecipe,
  GstockFormat,
  GstockDelivery,
  GstockStockTheoretical,
  SyncPhaseResult,
  SyncReport,
} from "./types"

// ─── Opciones y tipos ────────────────────────────────────────────

export interface SyncOptions {
  dryRun?: boolean
  skipKB?: boolean
  verbose?: boolean
  onProgress?: (phase: string, detail: string) => void
}

interface PhaseState extends SyncPhaseResult {
  startedAt: number
}

// ─── Helpers ─────────────────────────────────────────────────────

function startPhase(phase: string, endpoint: string, model: string): PhaseState {
  return { phase, endpoint, model, created: 0, updated: 0, skipped: 0, errors: [], durationMs: 0, startedAt: Date.now() }
}

function closePhase(state: PhaseState): SyncPhaseResult {
  const { startedAt, ...rest } = state
  return { ...rest, durationMs: Date.now() - startedAt }
}

function log(options: SyncOptions, ...args: unknown[]) {
  if (options.verbose) console.log("[GStock Sync]", ...args)
}

function onProgress(options: SyncOptions, phase: string, detail: string) {
  options.onProgress?.(phase, detail)
  log(options, `[${phase}]`, detail)
}

// ─── Fase 1: Unidades de medida ──────────────────────────────────
// Upsert por gstockId — robusto ante renombres y cambios de casing en GStock.

export async function syncMeasureUnits(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Unidades de medida", "v1/product/purchases/units/measure", "MeasureUnit")
  const idMap: GstockIdMap = new Map()

  onProgress(opts, state.phase, "Fetching...")
  const { data } = await fetchGstock<GstockMeasureUnit>("v1/product/purchases/units/measure")

  if (opts.verbose && data.length > 0) {
    log(opts, "MeasureUnit campos:", Object.keys(data[0] as object).join(", "))
  }

  // GStock a veces devuelve solo { id, name } — el name actúa como abreviatura ("gr", "KG", "ml"...)
  const getAbbr = (raw: GstockMeasureUnit): string =>
    (extractAbbreviation(raw) ?? raw.name).trim()

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      const abbr = getAbbr(raw)
      const mapped = mapGstockToMeasureUnit(raw, abbr)
      // Buscar primero por gstockId; si no existe, buscar por abbreviation (unidades creadas manualmente)
      const existing =
        await prisma.measureUnit.findUnique({ where: { gstockId: String(raw.id) }, select: { id: true } }) ??
        await prisma.measureUnit.findUnique({ where: { abbreviation: abbr }, select: { id: true } })
      if (existing) {
        await prisma.measureUnit.update({ where: { id: existing.id }, data: mapped })
        idMap.set(String(raw.id), existing.id)
        state.updated++
      } else {
        const created = await prisma.measureUnit.create({ data: mapped })
        idMap.set(String(raw.id), created.id)
        state.created++
      }
    } catch (e) {
      state.errors.push(`MeasureUnit "${raw.name}": ${e instanceof Error ? e.message : String(e)}`)
      state.skipped++
    }
  }

  onProgress(opts, state.phase, `${state.created} creadas, ${state.updated} actualizadas, ${state.skipped} errores`)
  return [closePhase(state), idMap]
}

// ─── Fase 2: Categorías de productos ────────────────────────────

export async function syncCategories(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Categorías de productos", "v1/product/purchases/categories", "Category")
  const idMap: GstockIdMap = new Map()

  const { data } = await fetchGstock<GstockCategory>("v1/product/purchases/categories")

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      const mapped = mapGstockToCategory(raw, idMap)
      // Buscar por gstockId; si no existe, fallback por nombre (para vincular categorías creadas manualmente)
      const existing =
        await prisma.category.findUnique({ where: { gstockId: String(raw.id) }, select: { id: true } }) ??
        await prisma.category.findFirst({ where: { name: raw.name, gstockId: null }, select: { id: true } })
      if (existing) {
        await prisma.category.update({ where: { id: existing.id }, data: mapped })
        state.updated++
        idMap.set(String(raw.id), existing.id)
      } else {
        const created = await prisma.category.create({ data: mapped })
        state.created++
        idMap.set(String(raw.id), created.id)
      }
    } catch (e) {
      state.errors.push(`Category ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creadas, ${state.updated} actualizadas`)
  return [closePhase(state), idMap]
}

// ─── Fase 3: Categorías de recetas ──────────────────────────────

export async function syncRecipeCategories(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Categorías de recetas", "v1/recipes/categories", "RecipeCategory")
  const idMap: GstockIdMap = new Map()

  const { data } = await fetchGstock<GstockRecipeCategory>("v1/recipes/categories")

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      const mapped = mapGstockToRecipeCategory(raw)
      const result = await prisma.recipeCategory.upsert({
        where: { gstockId: String(raw.id) },
        update: mapped,
        create: mapped,
        select: { id: true },
      })
      idMap.set(String(raw.id), result.id)
      state.updated++
    } catch (e) {
      state.errors.push(`RecipeCategory ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.updated} sincronizadas`)
  return [closePhase(state), idMap]
}

// ─── Fase 4: Familias de recetas ─────────────────────────────────

export async function syncRecipeFamilies(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Familias de recetas", "v1/recipes/families", "RecipeFamily")
  const idMap: GstockIdMap = new Map()

  const { data } = await fetchGstock<GstockRecipeFamily>("v1/recipes/families")

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      const mapped = mapGstockToRecipeFamily(raw)
      const result = await prisma.recipeFamily.upsert({
        where: { gstockId: String(raw.id) },
        update: mapped,
        create: mapped,
        select: { id: true },
      })
      idMap.set(String(raw.id), result.id)
      state.updated++
    } catch (e) {
      state.errors.push(`RecipeFamily ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.updated} sincronizadas`)
  return [closePhase(state), idMap]
}

// ─── Fase 5: Proveedores ─────────────────────────────────────────

export async function syncSuppliers(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Proveedores", "v1/suppliers", "Supplier")
  const idMap: GstockIdMap = new Map()

  // Fetch categorías/subcategorías en paralelo con los proveedores para enriquecer los datos
  const [{ data: categories }, { data: subcategories }, { data }] = await Promise.all([
    fetchGstock<{ id: string | number; name: string }>("v1/suppliers/category").catch(() => ({ data: [] as { id: string | number; name: string }[] })),
    fetchGstock<{ id: string | number; name: string }>("v1/suppliers/subcategory").catch(() => ({ data: [] as { id: string | number; name: string }[] })),
    fetchGstock<GstockSupplier>("v1/suppliers"),
  ])

  const catMap = new Map(categories.map(c => [String(c.id), c.name]))
  const subcatMap = new Map(subcategories.map(s => [String(s.id), s.name]))

  if (opts.verbose && data.length > 0) {
    log(opts, "Supplier campos:", Object.keys(data[0] as object).join(", "))
    log(opts, `Categorías de proveedor: ${categories.length}, Subcategorías: ${subcategories.length}`)
  }

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      // Enriquecer con nombre de categoría/subcategoría via los mapas de lookup
      const enriched: GstockSupplier = {
        ...raw,
        ...(raw.categoryId && { categoryName: catMap.get(String(raw.categoryId)) }),
        ...(raw.subcategoryId && { subcategoryName: subcatMap.get(String(raw.subcategoryId)) }),
      }
      const mapped = mapGstockToSupplier(enriched)
      // Buscar por gstockId; si no existe, fallback por nombre (para vincular proveedores creados manualmente)
      const existing =
        await prisma.supplier.findUnique({ where: { gstockId: String(raw.id) }, select: { id: true } }) ??
        await prisma.supplier.findFirst({ where: { name: raw.name, gstockId: null }, select: { id: true } })
      if (existing) {
        await prisma.supplier.update({ where: { id: existing.id }, data: mapped })
        idMap.set(String(raw.id), existing.id)
        state.updated++
      } else {
        const created = await prisma.supplier.create({ data: mapped })
        idMap.set(String(raw.id), created.id)
        state.created++
      }
    } catch (e) {
      state.errors.push(`Supplier ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creados, ${state.updated} actualizados`)
  return [closePhase(state), idMap]
}

// ─── Enriquecimiento: proveedor (albaranes) + stock teórico ─────

/**
 * Obtiene datos de enriquecimiento para ingredientes desde endpoints adicionales:
 * - Formatos (v1/product/purchases/formats) → mapa formatId → productId
 * - Albaranes (v1/delivery/purchases) → proveedor más reciente por producto
 * - Stock teórico (v1/stockTheoreticals) → stock calculado por producto
 */
export async function fetchIngredientEnrichment(
  supplierMap: GstockIdMap,
  opts: SyncOptions
): Promise<IngredientEnrichment> {
  const productSupplierMap = new Map<string, string>()
  const stockMap = new Map<string, number>()

  // 1. Formatos: formatId → productId (para cruzar con albaranes)
  onProgress(opts, "Enriquecimiento", "Cargando formatos...")
  let formatToProduct = new Map<string, string>()
  try {
    const { data: formats } = await fetchGstock<GstockFormat>("v1/product/purchases/formats")
    formatToProduct = new Map(
      formats.map(f => [String(f.id), String(f.productPurchaseId)])
    )
    log(opts, `Formatos cargados: ${formatToProduct.size}`)
  } catch (e) {
    log(opts, `Error cargando formatos (no crítico): ${e instanceof Error ? e.message : String(e)}`)
  }

  // 2. Centros (cacheado — se usa para albaranes y stock)
  let centers: { id: string | number }[] = []
  try {
    const result = await fetchGstock<{ id: string | number }>("v1/centers")
    centers = result.data
    log(opts, `Centros cargados: ${centers.length}`)
  } catch (e) {
    log(opts, `Error cargando centros (no crítico): ${e instanceof Error ? e.message : String(e)}`)
  }

  // 3. Albaranes: proveedor más reciente por producto
  onProgress(opts, "Enriquecimiento", "Cargando albaranes recientes...")
  if (centers.length > 0) {
    try {
      const today = new Date()
      const startDate = new Date(today)
      startDate.setMonth(startDate.getMonth() - 6) // últimos 6 meses
      const startStr = startDate.toISOString().split("T")[0]
      const endStr = today.toISOString().split("T")[0]

      // Consultar albaranes de todos los centros en paralelo
      const deliveryPromises = centers.map(c =>
        fetchGstock<GstockDelivery>(
          `v1/delivery/purchases?centerId=${c.id}&startDate=${startStr}&endDate=${endStr}`
        ).catch(() => ({ data: [] as GstockDelivery[] }))
      )
      const deliveryResults = await Promise.all(deliveryPromises)

      // Mapear proveedor → productos, priorizando el albarán más reciente
      const latestSupplier = new Map<string, { supplierId: string; date: string }>()

      for (const { data: deliveries } of deliveryResults) {
        for (const delivery of deliveries) {
          const supplierId = String(delivery.supplierId)
          const deliveryDate = delivery.date

          for (const item of delivery.items ?? []) {
            const formatId = String(item.formatId)
            const productId = formatToProduct.get(formatId)
            if (!productId) continue

            const existing = latestSupplier.get(productId)
            if (!existing || deliveryDate > existing.date) {
              latestSupplier.set(productId, { supplierId, date: deliveryDate })
            }
          }
        }
      }

      for (const [productId, { supplierId }] of latestSupplier) {
        productSupplierMap.set(productId, supplierId)
      }
      log(opts, `Proveedores mapeados: ${productSupplierMap.size} productos`)
    } catch (e) {
      log(opts, `Error cargando albaranes (no crítico): ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 4. Stock teórico: stock calculado por producto
  onProgress(opts, "Enriquecimiento", "Cargando stock teórico...")
  if (centers.length > 0) {
    try {
      const today = new Date().toISOString().split("T")[0]

      // Consultar stock teórico de todos los centros en paralelo
      const stockPromises = centers.map(c =>
        fetchGstock<GstockStockTheoretical>(
          `v1/stockTheoreticals?date=${today}&centerId=${c.id}`
        ).catch(() => ({ data: [] as GstockStockTheoretical[] }))
      )
      const stockResults = await Promise.all(stockPromises)

      // Sumar stock de todos los centros por producto
      for (const { data: stocks } of stockResults) {
        for (const stock of stocks) {
          const productId = String(stock.productId)
          const current = stockMap.get(productId) ?? 0
          stockMap.set(productId, current + (stock.total ?? 0))
        }
      }
      log(opts, `Stock teórico cargado: ${stockMap.size} productos`)
    } catch (e) {
      log(opts, `Error cargando stock teórico (no crítico): ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { supplierMap, productSupplierMap, stockMap }
}

// ─── Fase 6: Ingredientes ────────────────────────────────────────

export async function syncIngredients(
  unitMap: GstockIdMap,
  categoryMap: GstockIdMap,
  supplierMap: GstockIdMap,
  opts: SyncOptions
): Promise<[SyncPhaseResult, GstockIdMap, Map<string, string>, GstockIdMap]> {
  const state = startPhase("Ingredientes", "v1/product/purchases", "Ingredient")
  const idMap: GstockIdMap = new Map()
  // gstockProductId (como string) → ingredientName (para inferencia de alérgenos en fase 7)
  const nameMap = new Map<string, string>()
  // gstockProductId → prismaUnitId (la unidad se hereda del producto, no viene por línea de receta)
  const productUnitMap: GstockIdMap = new Map()

  // Enriquecimiento: proveedor (vía albaranes) y stock teórico
  const enrichment = await fetchIngredientEnrichment(supplierMap, opts)

  const { data } = await fetchGstock<GstockProduct>("v1/product/purchases")

  // IDs numéricos convertidos a string para comparar con el campo reference (String en Prisma)
  const gstockIds = data.map(p => String(p.id))
  const existing = await prisma.ingredient.findMany({
    where: { reference: { in: gstockIds } },
    select: { id: true, reference: true },
  })
  const existingByRef = new Map(existing.map(e => [e.reference!, e.id]))

  // Preparar operaciones en memoria antes de ejecutar DB
  const updates: { id: string; data: ReturnType<typeof mapGstockToIngredient>; gstockId: string }[] = []
  const creates: { data: NonNullable<ReturnType<typeof mapGstockToIngredient>>; gstockId: string; name: string }[] = []

  for (const raw of data) {
    const gstockId = String(raw.id)
    nameMap.set(gstockId, raw.name)

    // Construir mapa productId → prismaUnitId para uso en fase 7 (recipe ingredients)
    if (raw.measureUnitId) {
      const prismaUnitId = unitMap.get(String(raw.measureUnitId))
      if (prismaUnitId) productUnitMap.set(gstockId, prismaUnitId)
    }

    try {
      const mapped = mapGstockToIngredient(raw, unitMap, categoryMap, enrichment)
      if (!mapped) { state.skipped++; continue }
      if (opts.dryRun) { state.skipped++; idMap.set(gstockId, gstockId); continue }

      const existingId = existingByRef.get(gstockId)
      if (existingId) {
        updates.push({ id: existingId, data: mapped, gstockId })
        idMap.set(gstockId, existingId)
      } else {
        creates.push({ data: mapped, gstockId, name: raw.name })
      }
    } catch (e) {
      state.errors.push(`Ingredient ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Ejecutar updates en batches de 50 via $transaction
  const BATCH_SIZE = 50
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    try {
      await prisma.$transaction(
        batch.map(({ id, data }) => prisma.ingredient.update({ where: { id }, data: data! }))
      )
      state.updated += batch.length
    } catch (e) {
      // Fallback: ejecutar individualmente para identificar el registro problemático
      for (const { id, data, gstockId } of batch) {
        try {
          await prisma.ingredient.update({ where: { id }, data: data! })
          state.updated++
        } catch (e2) {
          state.errors.push(`Ingredient update ${gstockId}: ${e2 instanceof Error ? e2.message : String(e2)}`)
        }
      }
    }
  }

  // Ejecutar creates individualmente (necesitamos capturar el ID generado)
  for (const { data, gstockId, name } of creates) {
    try {
      const created = await prisma.ingredient.create({ data })
      state.created++
      idMap.set(gstockId, created.id)
    } catch (e) {
      state.errors.push(`Ingredient ${name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creados, ${state.updated} actualizados, ${state.skipped} omitidos`)
  return [closePhase(state), idMap, nameMap, productUnitMap]
}

// ─── Fase 7: Recetas + ingredientes ──────────────────────────────

export async function syncRecipes(
  recipeCategoryMap: GstockIdMap,
  familyMap: GstockIdMap,
  ingredientMap: GstockIdMap,
  productUnitMap: GstockIdMap,
  ingredientNameMap: Map<string, string>,
  opts: SyncOptions
): Promise<SyncPhaseResult> {
  const state = startPhase("Recetas", "v2/recipes", "Recipe + RecipeIngredient")

  // Categoría fallback para recetas sin categoryId en GStock
  const FALLBACK_GSTOCK_ID = "__sin_clasificar__"
  const fallbackCategory = await prisma.recipeCategory.upsert({
    where: { gstockId: FALLBACK_GSTOCK_ID },
    update: {},
    create: { name: "Sin clasificar", gstockId: FALLBACK_GSTOCK_ID, description: "Categoría por defecto para recetas sin clasificar en GStock" },
    select: { id: true },
  })
  const fallbackCategoryId = fallbackCategory.id

  const { data } = await fetchGstock<GstockRecipe>("v2/recipes")

  // Pre-cargar recetas existentes por externalId en batch (evita N findUnique)
  // Incluimos steps para saber si ya tienen pasos de Yurest que no debemos sobreescribir
  const externalIds = data.map(r => String(r.id)).filter(Boolean)
  const existingRecipes = await prisma.recipe.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true, externalId: true, steps: true },
  })
  const existingByExternalId = new Map(existingRecipes.map(r => [r.externalId!, { id: r.id, hasSteps: r.steps.length > 0 }]))

  for (const raw of data) {
    try {
      const mapped = mapGstockToRecipe(raw, recipeCategoryMap, familyMap, fallbackCategoryId)
      if (!mapped) { state.skipped++; continue }

      // Inferir alérgenos desde nombres de ingredientes (IDs numéricos → string para lookup)
      const ingredientNames = (raw.ingredients ?? [])
        .filter(l => l.productId)
        .map(l => ingredientNameMap.get(String(l.productId!)) ?? "")
        .filter(Boolean)
      const inferred = inferAllergensForRecipe(ingredientNames)
      const gstockAllergens = (mapped.allergens as string[] | undefined) ?? []
      const mergedAllergens = mergeAllergens(gstockAllergens as never, inferred)

      const recipeData = { ...mapped, allergens: mergedAllergens }

      if (opts.dryRun) { state.skipped++; continue }

      const existing = existingByExternalId.get(mapped.externalId)

      let recipeId: string
      if (existing) {
        // No sobreescribir steps de Yurest si GStock no trae elaboraciones
        const updateData = { ...recipeData }
        const gstockBringsSteps = Array.isArray(updateData.steps) && updateData.steps.length > 0
        if (!gstockBringsSteps && existing.hasSteps) {
          delete updateData.steps
        }
        await prisma.recipe.update({ where: { id: existing.id }, data: updateData })
        state.updated++
        recipeId = existing.id
      } else {
        const created = await prisma.recipe.create({ data: recipeData })
        state.created++
        recipeId = created.id
      }

      // Recrear ingredientes de la receta (delete + create en una transacción)
      const ingredientLines = mapGstockRecipeIngredients(raw, ingredientMap, productUnitMap)
      await prisma.$transaction([
        prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
        ...(ingredientLines.length
          ? [prisma.recipeIngredient.createMany({
              data: ingredientLines.map(line => ({ ...line, recipeId })),
            })]
          : []),
      ])
    } catch (e) {
      state.errors.push(`Recipe ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creadas, ${state.updated} actualizadas, ${state.skipped} omitidas`)
  return closePhase(state)
}

// ─── Fase 8: Knowledge Base ──────────────────────────────────────

export async function syncKnowledgeBase(opts: SyncOptions): Promise<[SyncPhaseResult, number]> {
  const state = startPhase("Knowledge Base", "(local)", "KnowledgeBase + Pinecone")

  onProgress(opts, state.phase, "Cargando recetas sincronizadas...")
  const recipes = await prisma.recipe.findMany({
    where: { externalSource: "gstock" },
    include: {
      category: true,
      family: true,
      ingredients: {
        include: { ingredient: true, unit: true },
        orderBy: { order: "asc" },
      },
    },
  })

  const kbEntries = generateRecipeKBEntries(recipes)
  onProgress(opts, state.phase, `${kbEntries.length} entries generadas, subiendo a Pinecone...`)

  if (!opts.dryRun && kbEntries.length) {
    const result = await syncKBBySourceCore("gstock-recipes", kbEntries, ["atc", "gastrolab"])
    state.created = result.created
  } else {
    state.skipped = kbEntries.length
  }

  onProgress(opts, state.phase, `${state.created} entries indexadas`)
  return [closePhase(state), kbEntries.length]
}

// ─── Orquestador principal ───────────────────────────────────────

export async function syncGstockToGastrolab(options: SyncOptions = {}): Promise<SyncReport> {
  const startedAt = Date.now()
  const phases: SyncPhaseResult[] = []
  const errors: string[] = []
  let kbEntries = 0

  try {
    const [p1, unitMap] = await syncMeasureUnits(options)
    phases.push(p1)
    errors.push(...p1.errors)

    const [p2, categoryMap] = await syncCategories(options)
    phases.push(p2)
    errors.push(...p2.errors)

    const [p3, recipeCategoryMap] = await syncRecipeCategories(options)
    phases.push(p3)
    errors.push(...p3.errors)

    const [p4, familyMap] = await syncRecipeFamilies(options)
    phases.push(p4)
    errors.push(...p4.errors)

    const [p5, supplierMap] = await syncSuppliers(options)
    phases.push(p5)
    errors.push(...p5.errors)

    const [p6, ingredientMap, ingredientNameMap, productUnitMap] = await syncIngredients(unitMap, categoryMap, supplierMap, options)
    phases.push(p6)
    errors.push(...p6.errors)

    const p7 = await syncRecipes(recipeCategoryMap, familyMap, ingredientMap, productUnitMap, ingredientNameMap, options)
    phases.push(p7)
    errors.push(...p7.errors)

    if (!options.skipKB) {
      const [p8, count] = await syncKnowledgeBase(options)
      phases.push(p8)
      errors.push(...p8.errors)
      kbEntries = count
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`Error fatal: ${msg}`)
    console.error("[GStock Sync] Fatal error:", e)
  }

  return { phases, kbEntries, durationMs: Date.now() - startedAt, errors }
}

/**
 * Ejecuta SOLO la fase de Knowledge Base (sin sync completo de GStock).
 * Útil para regenerar las KB entries desde las recetas ya sincronizadas en DB.
 */
export async function syncKnowledgeBaseOnly(): Promise<Record<string, unknown>> {
  const [result, count] = await syncKnowledgeBase({})
  return {
    phase: result.phase,
    created: result.created,
    kbEntries: count,
    durationMs: result.durationMs,
    errors: result.errors,
  }
}
