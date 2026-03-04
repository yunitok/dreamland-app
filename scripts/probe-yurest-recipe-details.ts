/**
 * Script de sondeo: busca endpoints de detalle de recetas en Yurest API.
 *
 * Prueba variantes de URL para descubrir si existe un endpoint de detalle
 * que devuelva los pasos de elaboración, ingredientes, etc.
 *
 * Ejecución: npx tsx scripts/probe-yurest-recipe-details.ts
 */
import "dotenv/config"
import * as fs from "fs"
import * as path from "path"

// Butter Chicken de Yurest: id=701754
const RECIPE_ID = "701754"
const RECIPE_NAME = "Salsa butter chicken"

interface ProbeResult {
  endpoint: string
  httpStatus: number
  hasData: boolean
  dataPreview: unknown
  error?: string
}

const ENDPOINTS_TO_PROBE = [
  // Detalle individual de receta
  `recipes/${RECIPE_ID}`,
  `recipes?id=${RECIPE_ID}`,

  // Sub-recursos de receta
  `recipes/${RECIPE_ID}/steps`,
  `recipes/${RECIPE_ID}/elaboration`,
  `recipes/${RECIPE_ID}/ingredients`,
  `recipes/${RECIPE_ID}/instructions`,
  `recipes/${RECIPE_ID}/details`,

  // Endpoints separados de elaboración
  `recipe-steps`,
  `recipe-steps/${RECIPE_ID}`,
  `recipe-elaboration`,
  `recipe-elaboration/${RECIPE_ID}`,
  `recipe-instructions`,
  `recipe-instructions/${RECIPE_ID}`,
  `recipe-ingredients`,
  `recipe-ingredients/${RECIPE_ID}`,

  // Endpoints de producción/cocina (mencionados en docs)
  `productions`,
  `kitchen-planner`,
  `product-data-sheets`,

  // Variantes de recetas con parámetros
  `recipes?include=steps`,
  `recipes?include=ingredients`,
  `recipes?include=all`,
  `recipes?expand=true`,
]

async function probeEndpoint(baseUrl: string, token: string, endpoint: string): Promise<ProbeResult> {
  const url = `${baseUrl}/${token}/${endpoint}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    let dataPreview: unknown = null
    let hasData = false

    if (response.ok) {
      const json = await response.json()
      hasData = true

      if (json.data && Array.isArray(json.data)) {
        const first = json.data[0]
        dataPreview = {
          totalRecords: json.data.length,
          firstRecordKeys: first ? Object.keys(first) : [],
          firstRecord: first ? JSON.stringify(first).substring(0, 500) : null,
        }
      } else if (json.data && typeof json.data === "object") {
        dataPreview = {
          type: "object",
          keys: Object.keys(json.data),
          preview: JSON.stringify(json.data).substring(0, 500),
        }
      } else {
        dataPreview = {
          rawPreview: JSON.stringify(json).substring(0, 500),
          keys: Object.keys(json),
        }
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
  const baseUrl = process.env.YUREST_API_URL
  const token = process.env.YUREST_TOKEN

  if (!baseUrl || !token) {
    console.error("YUREST_API_URL y YUREST_TOKEN deben estar configurados")
    process.exit(1)
  }

  console.log(`Sondeando endpoints de Yurest para receta: ${RECIPE_NAME} (id=${RECIPE_ID})...\n`)

  const results: ProbeResult[] = []

  for (const endpoint of ENDPOINTS_TO_PROBE) {
    const result = await probeEndpoint(baseUrl, token, endpoint)
    results.push(result)

    const statusIcon = result.httpStatus === 200 ? "✅" : result.httpStatus === 404 ? "❌" : "⚠️"
    console.log(`${statusIcon} ${String(result.httpStatus).padEnd(4)} ${endpoint}`)

    if (result.hasData && result.dataPreview) {
      const preview = result.dataPreview as Record<string, unknown>
      if (preview.totalRecords !== undefined) {
        console.log(`   → ${preview.totalRecords} registros, keys: ${(preview.firstRecordKeys as string[]).join(", ")}`)
      } else if (preview.keys) {
        console.log(`   → keys: ${(preview.keys as string[]).join(", ")}`)
      }
    }
  }

  // Guardar resultados
  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "yurest-recipe-detail-probe.json")

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      recipeId: RECIPE_ID,
      recipeName: RECIPE_NAME,
      totalEndpointsProbed: results.length,
    },
    results,
    summary: {
      successful: results.filter((r) => r.httpStatus === 200).map((r) => r.endpoint),
      notFound: results.filter((r) => r.httpStatus === 404).map((r) => r.endpoint),
      other: results.filter((r) => r.httpStatus !== 200 && r.httpStatus !== 404).map((r) => ({ endpoint: r.endpoint, status: r.httpStatus })),
    },
  }

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  RESUMEN DEL SONDEO YUREST")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  ✅ Responden 200: ${report.summary.successful.length}`)
  console.log(`     ${report.summary.successful.join(", ") || "(ninguno)"}`)
  console.log(`  ❌ No encontrados: ${report.summary.notFound.length}`)
  console.log(`  ⚠️  Otros: ${report.summary.other.length}`)
  console.log(`\n  Reporte guardado en: ${outPath}`)
  console.log("═══════════════════════════════════════════════════════\n")
}

main().catch((err) => {
  console.error("Error durante el sondeo:", err)
  process.exit(1)
})
