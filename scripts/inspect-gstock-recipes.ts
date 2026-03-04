/**
 * Script de diagnóstico: inspección de campos raw de recetas GStock v2.
 *
 * Objetivo: detectar campos nuevos o ahora poblados en la API que no
 * estamos capturando en nuestro tipo GstockRecipe ni persistiendo en Prisma.
 *
 * Ejecución: npx tsx scripts/inspect-gstock-recipes.ts
 */
import "dotenv/config"
import { fetchGstock } from "../src/lib/gstock"
import * as fs from "fs"
import * as path from "path"

// ─── Tipos internos del reporte ──────────────────────────────────

interface FieldStats {
  total: number
  nonEmpty: number
  populationRate: string
  sampleValues: unknown[]
}

interface InspectionReport {
  meta: {
    generatedAt: string
    totalRecipes: number
    durationMs: number
  }
  fieldAnalysis: {
    allApiFields: string[]
    previouslyKnownFields: string[]
    newFields: string[]
    ingredientLineFields: string[]
    newIngredientFields: string[]
  }
  fieldPopulation: Record<string, FieldStats>
  /** 3-5 recetas completas como muestra cruda */
  sampleRecipes: unknown[]
  /** Recetas con shortDescription o description poblada (muestra) */
  recipesWithDescription: unknown[]
  /** Recetas con image o urlInfo poblada (muestra) */
  recipesWithMedia: unknown[]
}

// ─── Campos conocidos del reporte del 28-Feb ─────────────────────

const PREVIOUSLY_KNOWN_RECIPE_FIELDS = new Set([
  "id", "subrecipe", "version", "recipeParentId", "startDate", "endDate",
  "name", "reference", "categoryId", "familyId", "subrecipeUnitId",
  "quantityUnitSubrecipe", "cost", "percentageCost", "suggestedPrice",
  "active", "shortDescription", "urlInfo", "image", "creationDate",
  "modificationDate", "expirationDays", "allergens", "ingredients",
])

const PREVIOUSLY_KNOWN_INGREDIENT_LINE_FIELDS = new Set([
  "productId", "quantityMeasure", "quantityShrinkage", "recipeId",
])

// ─── Helpers ─────────────────────────────────────────────────────

const isNonEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === "string" && value.trim() === "") return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}

const analyzeFieldPopulation = (
  recipes: Record<string, unknown>[],
  allKeys: Set<string>,
): Record<string, FieldStats> => {
  const result: Record<string, FieldStats> = {}

  for (const key of allKeys) {
    const nonEmptyRecipes = recipes.filter((r) => isNonEmpty(r[key]))
    result[key] = {
      total: recipes.length,
      nonEmpty: nonEmptyRecipes.length,
      populationRate: `${((nonEmptyRecipes.length / recipes.length) * 100).toFixed(1)}%`,
      sampleValues: nonEmptyRecipes.slice(0, 3).map((r) => r[key]),
    }
  }

  return result
}

const pickSampleRecipes = (recipes: unknown[], count = 5): unknown[] => {
  if (recipes.length <= count) return recipes
  const indices = [
    0,
    Math.floor(recipes.length / 4),
    Math.floor(recipes.length / 2),
    Math.floor((recipes.length * 3) / 4),
    recipes.length - 1,
  ]
  return [...new Set(indices)].map((i) => recipes[i])
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()

  console.log("Conectando con GStock API...")
  const response = (await fetchGstock("v2/recipes")) as { data: Record<string, unknown>[] }
  const allRecipes = response.data

  console.log(`Recetas obtenidas: ${allRecipes.length}\n`)

  // 1. Extraer TODAS las claves únicas a nivel receta
  const allRecipeKeys = new Set<string>()
  for (const recipe of allRecipes) {
    Object.keys(recipe).forEach((k) => allRecipeKeys.add(k))
  }

  // 2. Extraer claves únicas de líneas de ingredientes
  const allIngredientKeys = new Set<string>()
  for (const recipe of allRecipes) {
    const ingredients = recipe.ingredients as Record<string, unknown>[] | undefined
    for (const ing of ingredients ?? []) {
      Object.keys(ing).forEach((k) => allIngredientKeys.add(k))
    }
  }

  // 3. Detectar campos nuevos vs conocidos
  const newRecipeFields = [...allRecipeKeys].filter((k) => !PREVIOUSLY_KNOWN_RECIPE_FIELDS.has(k))
  const newIngredientFields = [...allIngredientKeys].filter(
    (k) => !PREVIOUSLY_KNOWN_INGREDIENT_LINE_FIELDS.has(k),
  )

  // 4. Análisis de población
  const fieldPopulation = analyzeFieldPopulation(allRecipes, allRecipeKeys)

  // 5. Filtrar recetas con descripción o media poblada
  const recipesWithDescription = allRecipes
    .filter((r) => isNonEmpty(r.shortDescription) || isNonEmpty(r.description))
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      name: r.name,
      shortDescription: r.shortDescription,
      description: (r as Record<string, unknown>).description,
    }))

  const recipesWithMedia = allRecipes
    .filter((r) => isNonEmpty(r.urlInfo) || isNonEmpty(r.image))
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      name: r.name,
      urlInfo: r.urlInfo,
      image: r.image,
    }))

  // 6. Generar reporte
  const report: InspectionReport = {
    meta: {
      generatedAt: new Date().toISOString(),
      totalRecipes: allRecipes.length,
      durationMs: Date.now() - startTime,
    },
    fieldAnalysis: {
      allApiFields: [...allRecipeKeys],
      previouslyKnownFields: [...PREVIOUSLY_KNOWN_RECIPE_FIELDS],
      newFields: newRecipeFields,
      ingredientLineFields: [...allIngredientKeys],
      newIngredientFields: newIngredientFields,
    },
    fieldPopulation,
    sampleRecipes: pickSampleRecipes(allRecipes),
    recipesWithDescription,
    recipesWithMedia,
  }

  // 7. Guardar a archivo
  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "gstock-recipe-inspection.json")
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  // 8. Imprimir resumen en consola
  console.log("═══════════════════════════════════════════════════════")
  console.log("  RESUMEN DE INSPECCIÓN DE RECETAS GSTOCK v2")
  console.log("═══════════════════════════════════════════════════════\n")

  console.log(`Total recetas: ${allRecipes.length}`)
  console.log(`Total campos API: ${allRecipeKeys.size}`)
  console.log(`Campos conocidos (28-Feb): ${PREVIOUSLY_KNOWN_RECIPE_FIELDS.size}`)
  console.log(`\nCAMPOS NUEVOS (${newRecipeFields.length}): ${newRecipeFields.join(", ") || "(ninguno)"}`)

  console.log("\n─── Tasa de población por campo ───────────────────────\n")
  const sortedKeys = [...allRecipeKeys].sort()
  for (const key of sortedKeys) {
    const stats = fieldPopulation[key]
    const isNew = !PREVIOUSLY_KNOWN_RECIPE_FIELDS.has(key) ? " ★ NUEVO" : ""
    const bar = stats.nonEmpty > 0 ? "█" : "░"
    console.log(
      `  ${bar} ${key.padEnd(30)} ${stats.populationRate.padStart(6)}  (${stats.nonEmpty}/${stats.total})${isNew}`,
    )
  }

  console.log("\n─── Campos de líneas de ingredientes ──────────────────\n")
  console.log(`  Campos: ${[...allIngredientKeys].join(", ")}`)
  console.log(
    `  Nuevos: ${newIngredientFields.join(", ") || "(ninguno)"}`,
  )

  console.log("\n─── Recetas con descripción poblada ───────────────────\n")
  if (recipesWithDescription.length === 0) {
    console.log("  (ninguna receta tiene shortDescription ni description)")
  } else {
    for (const r of recipesWithDescription) {
      const desc = (r as Record<string, unknown>).shortDescription || (r as Record<string, unknown>).description
      const preview = String(desc).substring(0, 120)
      console.log(`  [${(r as Record<string, unknown>).id}] ${(r as Record<string, unknown>).name}: "${preview}..."`)
    }
  }

  console.log("\n─── Recetas con imagen/URL ─────────────────────────────\n")
  if (recipesWithMedia.length === 0) {
    console.log("  (ninguna receta tiene image ni urlInfo)")
  } else {
    for (const r of recipesWithMedia) {
      console.log(`  [${(r as Record<string, unknown>).id}] ${(r as Record<string, unknown>).name}:`)
      if ((r as Record<string, unknown>).image) console.log(`    image: ${(r as Record<string, unknown>).image}`)
      if ((r as Record<string, unknown>).urlInfo) console.log(`    urlInfo: ${(r as Record<string, unknown>).urlInfo}`)
    }
  }

  console.log(`\nReporte guardado en: ${outPath}`)
  console.log("═══════════════════════════════════════════════════════\n")
}

main().catch((err) => {
  console.error("Error durante la inspección:", err)
  process.exit(1)
})
