/**
 * Script de sondeo: busca endpoints de elaboración de recetas en GStock API.
 *
 * Prueba múltiples variantes de URL contra la API real para descubrir
 * si existe un endpoint (documentado o no) que devuelva los pasos de
 * elaboración de las recetas.
 *
 * Ejecución: npx tsx scripts/probe-gstock-elaboration.ts
 */
import "dotenv/config"
import { getGstockToken } from "../src/lib/gstock"
import * as fs from "fs"
import * as path from "path"

// BUTTER CHICKEN: id=260, reference=253
const RECIPE_ID = "260"
const RECIPE_REF = "253"

interface ProbeResult {
  endpoint: string
  httpStatus: number
  hasData: boolean
  dataPreview: unknown
  error?: string
}

const ENDPOINTS_TO_PROBE = [
  // Prioridad 1 — Receta individual por ID
  `v2/recipes/${RECIPE_ID}`,
  `v1/recipes/${RECIPE_ID}`,
  `v2/recipes/${RECIPE_REF}`,
  `v1/recipes/${RECIPE_REF}`,
  `v2/recipes?id=${RECIPE_ID}`,
  `v1/recipes?id=${RECIPE_ID}`,

  // Prioridad 2 — Elaboración como subrecurso
  `v1/recipes/${RECIPE_ID}/elaboration`,
  `v2/recipes/${RECIPE_ID}/elaboration`,
  `v1/recipes/${RECIPE_ID}/steps`,
  `v2/recipes/${RECIPE_ID}/steps`,
  `v1/recipes/${RECIPE_ID}/elaborations`,
  `v2/recipes/${RECIPE_ID}/elaborations`,

  // Prioridad 3 — Elaboración como recurso separado
  `v1/recipes/elaboration`,
  `v2/recipes/elaboration`,
  `v1/recipeElaboration`,
  `v1/recipe-elaboration`,
  `v1/recipes/steps`,
  `v2/recipes/steps`,
  `v1/recipeElaboration/${RECIPE_ID}`,
  `v1/recipes/${RECIPE_REF}/elaboration`,
]

async function probeEndpoint(baseUrl: string, token: string, endpoint: string): Promise<ProbeResult> {
  const url = `${baseUrl}/${endpoint}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    })

    let dataPreview: unknown = null
    let hasData = false

    if (response.ok) {
      const json = await response.json()
      hasData = true

      // Si tiene data array, mostrar estructura del primer elemento
      if (json.data && Array.isArray(json.data)) {
        dataPreview = {
          totalRecords: json.data.length,
          firstRecord: json.data[0] ?? null,
          keys: json.data[0] ? Object.keys(json.data[0]) : [],
          page: json.page ?? null,
        }
      } else {
        // Respuesta sin estructura data[]
        const preview = JSON.stringify(json).substring(0, 500)
        dataPreview = { rawPreview: preview, keys: Object.keys(json) }
      }
    }

    return { endpoint, httpStatus: response.status, hasData, dataPreview }
  } catch (err) {
    return {
      endpoint,
      httpStatus: 0,
      hasData: false,
      dataPreview: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  const baseUrl = process.env.GSTOCK_API_URL
  if (!baseUrl) {
    console.error("GSTOCK_API_URL no está configurada")
    process.exit(1)
  }

  console.log("Obteniendo token de GStock...")
  const token = await getGstockToken()
  console.log("Token obtenido. Iniciando sondeo...\n")

  const results: ProbeResult[] = []

  for (const endpoint of ENDPOINTS_TO_PROBE) {
    const result = await probeEndpoint(baseUrl, token, endpoint)
    results.push(result)

    const statusIcon = result.httpStatus === 200 ? "✅" : result.httpStatus === 404 ? "❌" : "⚠️"
    console.log(`${statusIcon} ${String(result.httpStatus).padEnd(4)} ${endpoint}`)

    if (result.hasData && result.dataPreview) {
      const preview = result.dataPreview as Record<string, unknown>
      if (preview.totalRecords !== undefined) {
        console.log(`   → ${preview.totalRecords} registros, keys: ${(preview.keys as string[]).join(", ")}`)
      } else if (preview.keys) {
        console.log(`   → keys: ${(preview.keys as string[]).join(", ")}`)
      }
    }
  }

  // Guardar resultados
  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "gstock-elaboration-probe.json")

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      recipeId: RECIPE_ID,
      recipeRef: RECIPE_REF,
      recipeName: "BUTTER CHICKEN",
      totalEndpointsProbed: results.length,
    },
    results,
    summary: {
      successful: results.filter((r) => r.httpStatus === 200),
      notFound: results.filter((r) => r.httpStatus === 404),
      forbidden: results.filter((r) => r.httpStatus === 403),
      errors: results.filter((r) => r.httpStatus === 0),
      other: results.filter((r) => r.httpStatus !== 200 && r.httpStatus !== 404 && r.httpStatus !== 403 && r.httpStatus !== 0),
    },
  }

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  RESUMEN DEL SONDEO")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  ✅ Responden 200: ${report.summary.successful.length}`)
  console.log(`  ❌ No encontrados (404): ${report.summary.notFound.length}`)
  console.log(`  ⚠️  Prohibidos (403): ${report.summary.forbidden.length}`)
  console.log(`  💥 Errores: ${report.summary.errors.length}`)
  console.log(`  ❓ Otros: ${report.summary.other.length}`)
  console.log(`\n  Reporte guardado en: ${outPath}`)
  console.log("═══════════════════════════════════════════════════════\n")
}

main().catch((err) => {
  console.error("Error durante el sondeo:", err)
  process.exit(1)
})
