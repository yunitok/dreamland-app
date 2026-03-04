/**
 * Script de inspección: analiza los campos raw del endpoint /recipes de Yurest.
 *
 * Objetivo: verificar si Yurest devuelve pasos de elaboración (steps/instructions)
 * ya que GStock no los expone. Busca específicamente la receta "Butter Chicken".
 *
 * Ejecución: npx tsx scripts/inspect-yurest-recipes.ts
 */
import "dotenv/config"
import { fetchYurest } from "../src/lib/yurest"
import * as fs from "fs"
import * as path from "path"

// Campos que podrían contener elaboración/pasos
const ELABORATION_FIELD_HINTS = [
  "steps", "step", "elaboration", "elaborations", "instructions",
  "preparation", "procedure", "directions", "method", "process",
  "description", "content", "body", "text", "detail", "details",
  "preparacion", "elaboracion", "pasos", "instrucciones",
]

const isNonEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === "string" && value.trim() === "") return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}

interface FieldStats {
  total: number
  nonEmpty: number
  populationRate: string
  sampleValues: unknown[]
}

async function main() {
  const startTime = Date.now()

  console.log("Conectando con Yurest API (endpoint: recipes)...")
  const response = await fetchYurest<Record<string, unknown>>("recipes")

  console.log(`Yurest response — status: ${response.status}, message: ${response.message}`)

  const allRecipes = response.data
  if (!allRecipes || allRecipes.length === 0) {
    console.error("No se recibieron recetas de Yurest")
    process.exit(1)
  }
  console.log(`Recetas obtenidas: ${allRecipes.length}\n`)

  // 1. Extraer TODAS las claves únicas a nivel receta
  const allRecipeKeys = new Set<string>()
  for (const recipe of allRecipes) {
    Object.keys(recipe).forEach((k) => allRecipeKeys.add(k))
  }

  // 2. Detectar campos que podrían ser de elaboración
  const sortedKeys = [...allRecipeKeys].sort()
  const elaborationCandidates = sortedKeys.filter((k) =>
    ELABORATION_FIELD_HINTS.some((hint) => k.toLowerCase().includes(hint)),
  )

  // 3. Extraer claves de subobjetos (ingredientes u otros arrays)
  const subObjectKeys: Record<string, Set<string>> = {}
  for (const recipe of allRecipes) {
    for (const [key, value] of Object.entries(recipe)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        if (!subObjectKeys[key]) subObjectKeys[key] = new Set()
        for (const item of value) {
          Object.keys(item as Record<string, unknown>).forEach((k) => subObjectKeys[key].add(k))
        }
      }
    }
  }

  // 4. Análisis de población por campo
  const fieldPopulation: Record<string, FieldStats> = {}
  for (const key of allRecipeKeys) {
    const nonEmptyRecipes = allRecipes.filter((r) => isNonEmpty(r[key]))
    fieldPopulation[key] = {
      total: allRecipes.length,
      nonEmpty: nonEmptyRecipes.length,
      populationRate: `${((nonEmptyRecipes.length / allRecipes.length) * 100).toFixed(1)}%`,
      sampleValues: nonEmptyRecipes.slice(0, 3).map((r) => {
        const val = r[key]
        // Truncar strings largos para el reporte
        if (typeof val === "string" && val.length > 200) return val.substring(0, 200) + "..."
        return val
      }),
    }
  }

  // 5. Buscar Butter Chicken
  const butterChicken = allRecipes.find((r) => {
    const name = String(r.name ?? r.nombre ?? r.title ?? "").toLowerCase()
    return name.includes("butter chicken") || name.includes("butterchicken")
  })

  // 6. Muestra de recetas
  const sampleIndices = allRecipes.length <= 5
    ? allRecipes.map((_, i) => i)
    : [0, Math.floor(allRecipes.length / 4), Math.floor(allRecipes.length / 2), Math.floor(allRecipes.length * 3 / 4), allRecipes.length - 1]
  const sampleRecipes = [...new Set(sampleIndices)].map((i) => allRecipes[i])

  // 7. Generar reporte
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      totalRecipes: allRecipes.length,
      durationMs: Date.now() - startTime,
      apiEndpoint: "recipes",
    },
    fieldAnalysis: {
      allApiFields: sortedKeys,
      totalFields: allRecipeKeys.size,
      elaborationCandidates,
      subObjectFields: Object.fromEntries(
        Object.entries(subObjectKeys).map(([k, v]) => [k, [...v]]),
      ),
    },
    fieldPopulation,
    butterChicken: butterChicken ?? "NOT_FOUND",
    sampleRecipes,
  }

  // 8. Guardar a archivo
  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "yurest-recipe-inspection.json")
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  // 9. Imprimir resumen
  console.log("═══════════════════════════════════════════════════════")
  console.log("  INSPECCIÓN DE RECETAS YUREST — /recipes")
  console.log("═══════════════════════════════════════════════════════\n")

  console.log(`Total recetas: ${allRecipes.length}`)
  console.log(`Total campos: ${allRecipeKeys.size}`)
  console.log(`Campos: ${sortedKeys.join(", ")}`)

  console.log("\n─── Tasa de población por campo ───────────────────────\n")
  for (const key of sortedKeys) {
    const stats = fieldPopulation[key]
    const isElaboration = elaborationCandidates.includes(key) ? " ★ ELABORACIÓN?" : ""
    const bar = stats.nonEmpty > 0 ? "█" : "░"
    console.log(
      `  ${bar} ${key.padEnd(30)} ${stats.populationRate.padStart(6)}  (${stats.nonEmpty}/${stats.total})${isElaboration}`,
    )
  }

  if (Object.keys(subObjectKeys).length > 0) {
    console.log("\n─── Campos de subobjetos (arrays anidados) ────────────\n")
    for (const [key, keys] of Object.entries(subObjectKeys)) {
      console.log(`  ${key}: ${[...keys].join(", ")}`)
    }
  }

  console.log("\n─── Campos candidatos a elaboración ───────────────────\n")
  if (elaborationCandidates.length === 0) {
    console.log("  (!) Ningún campo coincide con hints de elaboración")
    console.log("      Revisar manualmente los campos del reporte JSON")
  } else {
    for (const field of elaborationCandidates) {
      const stats = fieldPopulation[field]
      console.log(`  ★ ${field}: ${stats.populationRate} poblado (${stats.nonEmpty}/${stats.total})`)
      if (stats.sampleValues.length > 0) {
        const preview = JSON.stringify(stats.sampleValues[0]).substring(0, 200)
        console.log(`    Muestra: ${preview}`)
      }
    }
  }

  console.log("\n─── Butter Chicken ────────────────────────────────────\n")
  if (!butterChicken) {
    console.log("  (!) Receta 'Butter Chicken' NO encontrada en Yurest")
    console.log("      Listando nombres de todas las recetas:")
    for (const r of allRecipes) {
      const name = r.name ?? r.nombre ?? r.title ?? "(sin nombre)"
      console.log(`    - ${name}`)
    }
  } else {
    console.log("  ✅ Butter Chicken ENCONTRADA:")
    console.log(JSON.stringify(butterChicken, null, 2))
  }

  console.log(`\nReporte completo guardado en: ${outPath}`)
  console.log("═══════════════════════════════════════════════════════\n")
}

main().catch((err) => {
  console.error("Error durante la inspección:", err)
  process.exit(1)
})
