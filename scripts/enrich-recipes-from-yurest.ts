/**
 * Enriquecimiento de recetas: cruza GStock (Prisma) con Yurest para obtener
 * los pasos de elaboración que GStock no expone.
 *
 * Fase 1 (siempre): Matching por nombre + ingredientes → genera reporte
 * Fase 2 (--write):  Fetch detalle Yurest + update en Prisma
 *
 * Ejecución:
 *   npx tsx scripts/enrich-recipes-from-yurest.ts              # Solo reporte
 *   npx tsx scripts/enrich-recipes-from-yurest.ts --write       # Reporte + escritura BD
 *   npx tsx scripts/enrich-recipes-from-yurest.ts --write --regenerate-kb
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  fetchYurest,
  fetchYurestRecipeDetail,
  type YurestRecipeListItem,
} from "../src/lib/yurest"
import {
  matchRecipes,
  type MatchResult,
  type GstockRecipeForMatching,
} from "../src/modules/sherlock/domain/yurest-matching/recipe-matcher"
import * as fs from "fs"
import * as path from "path"

// ─── Setup ──────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const args = process.argv.slice(2)
const WRITE_MODE = args.includes("--write")
const REGENERATE_KB = args.includes("--regenerate-kb")
const VERBOSE = args.includes("--verbose")
const FORCE = args.includes("--force")

// ─── Helpers ────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const status = err instanceof Error && err.message.includes("429") ? 429
      : err instanceof Error && err.message.includes("503") ? 503
      : 0
    if (status === 429 || status === 503) {
      console.log(`    ⏳ ${status} en ${label}, reintentando en 2s...`)
      await delay(2000)
      return fn()
    }
    throw err
  }
}

// ─── Fase 1: Matching ──────────────────────────────────────────

async function phase1(): Promise<MatchResult[]> {
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  FASE 1: MATCHING GStock ↔ Yurest")
  console.log("═══════════════════════════════════════════════════════\n")

  // 1.1 Cargar recetas GStock de Prisma con ingredientes
  console.log("Cargando recetas GStock de Prisma...")
  const dbRecipes = await prisma.recipe.findMany({
    where: { externalSource: "gstock" },
    include: {
      ingredients: {
        include: { ingredient: true },
        orderBy: { order: "asc" },
      },
    },
  })
  console.log(`  ${dbRecipes.length} recetas GStock en Prisma\n`)

  const gstockRecipes: GstockRecipeForMatching[] = dbRecipes.map(r => ({
    id: r.id,
    name: r.name,
    ingredientNames: r.ingredients.map(ri => ri.ingredient.name),
  }))

  // 1.2 Cargar listado Yurest
  console.log("Cargando listado de recetas Yurest...")
  const yurestResponse = await fetchYurest<YurestRecipeListItem>("recipes")
  const yurestRecipes = yurestResponse.data as YurestRecipeListItem[]
  console.log(`  ${yurestRecipes.length} recetas en Yurest\n`)

  // 1.3 Ejecutar matching
  console.log("Ejecutando matching...\n")
  const results = await matchRecipes(gstockRecipes, yurestRecipes, {
    onProgress: VERBOSE ? console.log : undefined,
    apiDelayMs: 200,
  })

  // 1.4 Clasificar resultados
  const high = results.filter(r => r.confidence === "HIGH")
  const medium = results.filter(r => r.confidence === "MEDIUM")
  const low = results.filter(r => r.confidence === "LOW")

  // 1.5 Imprimir resumen
  console.log("\n─── Resumen del Matching ───────────────────────────────\n")
  console.log(`  ✅ HIGH   (auto-match):  ${high.length}`)
  console.log(`  🔶 MEDIUM (validado):    ${medium.length}`)
  console.log(`  ❌ LOW    (descartado):  ${low.length}`)
  console.log(`  Total:                   ${results.length}`)

  if (!VERBOSE) {
    console.log("\n─── Matches HIGH ──────────────────────────────────────\n")
    for (const m of high) {
      console.log(`  ${m.gstockName.padEnd(45)} → ${m.yurestName} (${m.finalScore.toFixed(3)})`)
    }

    if (medium.length > 0) {
      console.log("\n─── Matches MEDIUM ────────────────────────────────────\n")
      for (const m of medium) {
        console.log(`  ${m.gstockName.padEnd(45)} → ${m.yurestName} (name=${m.nameScore.toFixed(3)}, ing=${m.ingredientScore?.toFixed(3) ?? "N/A"}, final=${m.finalScore.toFixed(3)})`)
      }
    }

    if (low.length > 0 && low.length <= 30) {
      console.log("\n─── Sin match (LOW) ───────────────────────────────────\n")
      for (const m of low) {
        console.log(`  ${m.gstockName.padEnd(45)} (mejor candidato: ${m.yurestName ?? "ninguno"}, score=${m.finalScore.toFixed(3)})`)
      }
    }
  }

  // 1.6 Guardar reporte JSON
  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "yurest-matching-report.json")
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      gstockRecipes: dbRecipes.length,
      yurestRecipes: yurestRecipes.length,
      highMatches: high.length,
      mediumMatches: medium.length,
      lowMatches: low.length,
    },
    high,
    medium,
    low,
  }
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(`\n  Reporte guardado: ${outPath}`)

  return results
}

// ─── Fase 2: Enrichment ────────────────────────────────────────

async function phase2(results: MatchResult[]): Promise<void> {
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  FASE 2: ENRICHMENT (escritura en BD)")
  console.log("═══════════════════════════════════════════════════════\n")

  const toEnrich = results.filter(r => r.confidence === "HIGH" || r.confidence === "MEDIUM")
  console.log(`  Recetas a enriquecer: ${toEnrich.length}\n`)

  let updated = 0
  let skipped = 0
  const errors: { name: string; error: string }[] = []

  for (const match of toEnrich) {
    if (!match.yurestId) continue

    // Verificar si ya tiene yurestId y steps (idempotencia)
    if (!FORCE) {
      const existing = await prisma.recipe.findUnique({
        where: { id: match.gstockRecipeId },
        select: { yurestId: true, steps: true },
      })
      if (existing?.yurestId && existing.steps.length > 0) {
        skipped++
        if (VERBOSE) console.log(`  ⏭️  ${match.gstockName} — ya enriquecida`)
        continue
      }
    }

    try {
      // Fetch detalle de Yurest
      const detail = await fetchWithRetry(
        () => fetchYurestRecipeDetail(match.yurestId!),
        match.gstockName
      )

      // Serializar steps
      const steps = detail.steps
        .sort((a, b) => a.order - b.order)
        .map(s => `${s.order}. ${s.title}: ${s.description}`)

      if (steps.length === 0) {
        skipped++
        if (VERBOSE) console.log(`  ⏭️  ${match.gstockName} — Yurest no tiene steps`)
        continue
      }

      // Update en Prisma
      await prisma.recipe.update({
        where: { id: match.gstockRecipeId },
        data: {
          yurestId: match.yurestId,
          steps,
        },
      })

      updated++
      console.log(`  ✅ ${match.gstockName} — ${steps.length} pasos guardados`)

      await delay(200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ name: match.gstockName, error: msg })
      console.log(`  ❌ ${match.gstockName} — Error: ${msg}`)
    }
  }

  console.log("\n─── Resumen Enrichment ────────────────────────────────\n")
  console.log(`  ✅ Actualizadas:  ${updated}`)
  console.log(`  ⏭️  Saltadas:     ${skipped}`)
  console.log(`  ❌ Errores:       ${errors.length}`)

  if (errors.length > 0) {
    console.log("\n  Errores detallados:")
    for (const e of errors) {
      console.log(`    ${e.name}: ${e.error}`)
    }
  }
}

// ─── Fase 3: KB Regeneration ───────────────────────────────────

async function phase3(): Promise<void> {
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  FASE 3: REGENERACIÓN DE KNOWLEDGE BASE")
  console.log("═══════════════════════════════════════════════════════\n")

  // Importar dinámicamente para evitar cargar Pinecone si no se necesita
  const { syncKnowledgeBaseOnly } = await import(
    "../src/modules/sherlock/domain/gstock-sync/sync-orchestrator"
  )
  const result = await syncKnowledgeBaseOnly()
  console.log(`  KB regenerada: ${result.created} creadas, ${result.updated} actualizadas, ${result.errors.length} errores`)
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════")
  console.log("  ENRIQUECIMIENTO DE RECETAS: GStock × Yurest")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  Modo: ${WRITE_MODE ? "ESCRITURA" : "SOLO REPORTE (dry-run)"}`)
  console.log(`  KB:   ${REGENERATE_KB ? "Regenerar tras escritura" : "No regenerar"}`)
  console.log(`  Force: ${FORCE ? "Sí (re-enriquecer existentes)" : "No"}`)

  const results = await phase1()

  if (WRITE_MODE) {
    await phase2(results)

    if (REGENERATE_KB) {
      await phase3()
    }
  } else {
    console.log("\n  ℹ️  Ejecuta con --write para guardar en BD")
  }

  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  COMPLETADO")
  console.log("═══════════════════════════════════════════════════════\n")
}

main()
  .catch(err => {
    console.error("Error fatal:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
