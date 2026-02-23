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
} from "./mappers"
import { generateRecipeKBEntries } from "./kb-generator"
import { syncKBBySourceCore } from "@/modules/atc/actions/knowledge-base-core"
import type {
  GstockMeasureUnit,
  GstockCategory,
  GstockRecipeCategory,
  GstockRecipeFamily,
  GstockSupplier,
  GstockProduct,
  GstockRecipe,
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

async function syncMeasureUnits(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
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
      const existing = await prisma.measureUnit.findUnique({ where: { gstockId: String(raw.id) }, select: { id: true } })
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

async function syncCategories(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Categorías de productos", "v1/product/purchases/categories", "Category")
  const idMap: GstockIdMap = new Map()

  const { data } = await fetchGstock<GstockCategory>("v1/product/purchases/categories")

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      const mapped = mapGstockToCategory(raw, idMap)
      const existing = await prisma.category.findUnique({ where: { gstockId: String(raw.id) }, select: { id: true } })
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

async function syncRecipeCategories(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
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

async function syncRecipeFamilies(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
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

async function syncSuppliers(opts: SyncOptions): Promise<[SyncPhaseResult, GstockIdMap]> {
  const state = startPhase("Proveedores", "v1/suppliers", "Supplier")
  const idMap: GstockIdMap = new Map()

  const { data } = await fetchGstock<GstockSupplier>("v1/suppliers")

  for (const raw of data) {
    if (opts.dryRun) { state.skipped++; idMap.set(String(raw.id), String(raw.id)); continue }
    try {
      const mapped = mapGstockToSupplier(raw)
      const result = await prisma.supplier.upsert({
        where: { gstockId: String(raw.id) },
        update: mapped,
        create: mapped,
        select: { id: true },
      })
      idMap.set(String(raw.id), result.id)
      state.updated++
    } catch (e) {
      state.errors.push(`Supplier ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creados, ${state.updated} actualizados`)
  return [closePhase(state), idMap]
}

// ─── Fase 6: Ingredientes ────────────────────────────────────────

async function syncIngredients(
  unitMap: GstockIdMap,
  categoryMap: GstockIdMap,
  supplierMap: GstockIdMap,
  opts: SyncOptions
): Promise<[SyncPhaseResult, GstockIdMap, Map<string, string>]> {
  const state = startPhase("Ingredientes", "v1/product/purchases", "Ingredient")
  const idMap: GstockIdMap = new Map()
  // gstockProductId (como string) → ingredientName (para inferencia de alérgenos en fase 7)
  const nameMap = new Map<string, string>()

  const { data } = await fetchGstock<GstockProduct>("v1/product/purchases")

  // IDs numéricos convertidos a string para comparar con el campo reference (String en Prisma)
  const gstockIds = data.map(p => String(p.id))
  const existing = await prisma.ingredient.findMany({
    where: { reference: { in: gstockIds } },
    select: { id: true, reference: true },
  })
  const existingByRef = new Map(existing.map(e => [e.reference!, e.id]))

  for (const raw of data) {
    const gstockId = String(raw.id)
    nameMap.set(gstockId, raw.name)
    try {
      const mapped = mapGstockToIngredient(raw, unitMap, categoryMap, supplierMap)
      if (!mapped) { state.skipped++; continue }
      if (opts.dryRun) { state.skipped++; idMap.set(gstockId, gstockId); continue }

      const existingId = existingByRef.get(gstockId)
      if (existingId) {
        await prisma.ingredient.update({ where: { id: existingId }, data: mapped })
        state.updated++
        idMap.set(gstockId, existingId)
      } else {
        const created = await prisma.ingredient.create({ data: mapped })
        state.created++
        idMap.set(gstockId, created.id)
      }
    } catch (e) {
      state.errors.push(`Ingredient ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creados, ${state.updated} actualizados, ${state.skipped} omitidos`)
  return [closePhase(state), idMap, nameMap]
}

// ─── Fase 7: Recetas + ingredientes ──────────────────────────────

async function syncRecipes(
  recipeCategoryMap: GstockIdMap,
  familyMap: GstockIdMap,
  ingredientMap: GstockIdMap,
  unitMap: GstockIdMap,
  ingredientNameMap: Map<string, string>,
  opts: SyncOptions
): Promise<SyncPhaseResult> {
  const state = startPhase("Recetas", "v2/recipes", "Recipe + RecipeIngredient")

  const { data } = await fetchGstock<GstockRecipe>("v2/recipes")

  for (const raw of data) {
    try {
      const mapped = mapGstockToRecipe(raw, recipeCategoryMap, familyMap)
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

      // externalId ya es string gracias al mapper (String(raw.id))
      const existing = await prisma.recipe.findUnique({
        where: { externalId: mapped.externalId },
        select: { id: true },
      })

      let recipeId: string
      if (existing) {
        await prisma.recipe.update({ where: { id: existing.id }, data: recipeData })
        state.updated++
        recipeId = existing.id
      } else {
        const created = await prisma.recipe.create({ data: recipeData })
        state.created++
        recipeId = created.id
      }

      // Recrear ingredientes de la receta (delete + create)
      await prisma.recipeIngredient.deleteMany({ where: { recipeId } })
      const ingredientLines = mapGstockRecipeIngredients(raw, ingredientMap, unitMap)
      if (ingredientLines.length) {
        await prisma.recipeIngredient.createMany({
          data: ingredientLines.map(line => ({ ...line, recipeId })),
        })
      }
    } catch (e) {
      state.errors.push(`Recipe ${raw.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(opts, state.phase, `${state.created} creadas, ${state.updated} actualizadas, ${state.skipped} omitidas`)
  return closePhase(state)
}

// ─── Fase 8: Knowledge Base ──────────────────────────────────────

async function syncKnowledgeBase(opts: SyncOptions): Promise<[SyncPhaseResult, number]> {
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
    const result = await syncKBBySourceCore("gstock-recipes", kbEntries)
    state.created = result.created
  } else {
    state.skipped = kbEntries.length
  }

  onProgress(opts, state.phase, `${state.created} entries indexadas`)
  return [closePhase(state), kbEntries.length]
}

// ─── Orquestador principal ───────────────────────────────────────

export async function syncGstockToSherlock(options: SyncOptions = {}): Promise<SyncReport> {
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

    const [p6, ingredientMap, ingredientNameMap] = await syncIngredients(unitMap, categoryMap, supplierMap, options)
    phases.push(p6)
    errors.push(...p6.errors)

    const p7 = await syncRecipes(recipeCategoryMap, familyMap, ingredientMap, unitMap, ingredientNameMap, options)
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
