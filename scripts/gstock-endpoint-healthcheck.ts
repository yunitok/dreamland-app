/**
 * GStock Endpoint Healthcheck — Verificación de todos los endpoints
 *
 * Recorre todos los endpoints GET definidos en GSTOCK_ENDPOINT_GROUPS
 * y los llama contra la API real para verificar su estado.
 *
 * Ejecutar:
 *   npx tsx scripts/gstock-endpoint-healthcheck.ts
 */

import "dotenv/config"
import { getGstockToken } from "../src/lib/gstock"

// ─── Colores ANSI ────────────────────────────────────────────────
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"

// ─── Definición completa de todos los endpoints a testear ────────
// Incluimos params de prueba para endpoints que los requieren

interface EndpointTest {
  group: string
  path: string
  label: string
  method: "GET" | "POST"
  testParams?: Record<string, string>
  skipReason?: string
}

const ENDPOINTS: EndpointTest[] = [
  // Productos & Compras
  { group: "Productos & Compras", path: "v1/product/purchases", label: "Productos de Compra", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/categories", label: "Categorías", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/families", label: "Familias", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/types", label: "Tipos", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/subtypes", label: "Subtipos", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/units/measure", label: "Unidades de Medida", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/units/display", label: "Unidades de Visualización", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/formats", label: "Formatos", method: "GET" },

  // Proveedores
  { group: "Proveedores", path: "v1/suppliers", label: "Proveedores", method: "GET" },
  { group: "Proveedores", path: "v1/suppliers/accounting", label: "Contabilidad Proveedores", method: "GET" },
  { group: "Proveedores", path: "v1/suppliers/category", label: "Categorías de Proveedores", method: "GET" },
  { group: "Proveedores", path: "v1/suppliers/subcategory", label: "Subcategorías de Proveedores", method: "GET" },

  // Pedidos & Albaranes
  { group: "Pedidos & Albaranes", path: "v1/order/purchases", label: "Pedidos de Compra", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos & Albaranes", path: "v1/delivery/purchases", label: "Albaranes de Compra", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos & Albaranes", path: "v1/delivery/purchases/accounting", label: "Contabilidad Albaranes", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos & Albaranes", path: "v1/invoices/purchases", label: "Facturas de Compra", method: "GET", testParams: { fromDate: "2025-01-01", toDate: "2025-12-31" } },
  { group: "Pedidos & Albaranes", path: "v1/invoices/purchases/accounting", label: "Facturas Compra Contab.", method: "GET", testParams: { fromDate: "2025-01-01", toDate: "2025-12-31" } },
  { group: "Pedidos & Albaranes", path: "v1/transfers", label: "Transferencias", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos & Albaranes", path: "v1/inventories", label: "Inventarios", method: "GET", testParams: { startDate: "2025-01-01" } },

  // Cocina & Recetas
  { group: "Cocina & Recetas", path: "v2/recipes", label: "Recetas", method: "GET" },
  { group: "Cocina & Recetas", path: "v1/recipes/categories", label: "Categorías de Recetas", method: "GET" },
  { group: "Cocina & Recetas", path: "v1/recipes/families", label: "Familias de Recetas", method: "GET" },
  { group: "Cocina & Recetas", path: "v1/subrecipes/units", label: "Unidades de Subrecetas", method: "GET" },
  { group: "Cocina & Recetas", path: "v1/productionOrder/subrecipe", label: "Órdenes de Producción", method: "GET" },

  // Ventas & POS
  // v1/pos/categories eliminado — HTTP 404 (ruta no existe en la API)
  { group: "Ventas & POS", path: "v1/plus", label: "PLUs", method: "GET", testParams: { pageNumber: "1", pageSize: "50" } },
  { group: "Ventas & POS", path: "v1/pos/loader/sales/json/realtime", label: "Ventas Tiempo Real", method: "POST", skipReason: "POST (requiere body)" },
  { group: "Ventas & POS", path: "v1/pos/loader/sales/json", label: "Carga de Ventas", method: "POST", skipReason: "POST (requiere body)" },
  // v1/invoices/sales/accounting, v1/articles/sales, v1/articles/sales/resulting-units eliminados — HTTP 403 Permission denied

  // Informes (con centerId=1 y startDate como parámetros de prueba)
  { group: "Informes", path: "v1/costReals", label: "Coste Real", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/items", label: "Coste Real (Items)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/categories", label: "Coste Real (Categorías)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/families", label: "Coste Real (Familias)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/types", label: "Coste Real (Tipos)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/subtypes", label: "Coste Real (Subtipos)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/subtypes/accounting", label: "Coste Real Subtipos Contab.", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/category/accounting", label: "Coste Real Cat. Contab.", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costTheoreticals", label: "Coste Teórico", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costTheoreticals/carte/items", label: "Coste Teórico (Carta)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costTheoreticals/packs/items", label: "Coste Teórico (Packs)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/stockVariations", label: "Variación de Stock", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/stockVariations/items", label: "Variación de Stock (Items)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/stockTheoreticals", label: "Stock Teórico", method: "GET", testParams: { date: "2025-06-01", centerId: "1" } },
  { group: "Informes", path: "v1/priceVariation/products", label: "Variación Precios (Productos)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/priceVariation/recipes", label: "Variación Precios (Recetas)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/priceVariation/formats", label: "Variación Precios (Formatos)", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/report/sales", label: "Reporte de Ventas", method: "GET", testParams: { reportType: "1", currencyCode: "EUR", centerId: "1", startDate: "2025-01-01" } },

  // Mermas
  { group: "Mermas", path: "v1/shrinkages/causes", label: "Causas de Merma", method: "GET" },
  { group: "Mermas", path: "v1/shrinkages/products", label: "Mermas de Productos", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Mermas", path: "v1/shrinkages/recipes", label: "Mermas de Recetas", method: "GET", testParams: { startDate: "2025-01-01" } },

  // Organización
  { group: "Organización", path: "v1/centers", label: "Centros", method: "GET" },
  { group: "Organización", path: "v1/centers/groups", label: "Grupos de Centros", method: "GET" },
  { group: "Organización", path: "v1/payment-methods", label: "Métodos de Pago", method: "GET" },
  { group: "Organización", path: "v1/imports", label: "Importaciones", method: "GET", testParams: { startDate: "2025-01-01" } },
]

// ─── Test runner ─────────────────────────────────────────────────

interface TestResult {
  group: string
  path: string
  label: string
  status: "OK" | "FAIL" | "SKIP"
  httpStatus?: number
  recordCount?: number
  responseTimeMs?: number
  error?: string
  errorBody?: string
}

async function testEndpoint(
  ep: EndpointTest,
  baseUrl: string,
  token: string
): Promise<TestResult> {
  if (ep.skipReason) {
    return { group: ep.group, path: ep.path, label: ep.label, status: "SKIP", error: ep.skipReason }
  }

  const params = new URLSearchParams(ep.testParams ?? {})
  const qs = params.toString()
  const url = `${baseUrl}/${ep.path}${qs ? `?${qs}` : ""}`

  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    })

    const elapsed = Date.now() - start
    const body = await res.text()
    let json: Record<string, unknown> | null = null
    try { json = JSON.parse(body) } catch { /* no-json */ }

    if (!res.ok) {
      const msg = json?.message ?? json?.error ?? res.statusText
      return {
        group: ep.group,
        path: ep.path,
        label: ep.label,
        status: "FAIL",
        httpStatus: res.status,
        responseTimeMs: elapsed,
        error: `HTTP ${res.status}: ${msg}`,
        errorBody: body.slice(0, 300),
      }
    }

    const data = json?.data
    const recordCount = Array.isArray(data) ? data.length : data ? 1 : 0

    return {
      group: ep.group,
      path: ep.path,
      label: ep.label,
      status: "OK",
      httpStatus: res.status,
      recordCount,
      responseTimeMs: elapsed,
    }
  } catch (err) {
    return {
      group: ep.group,
      path: ep.path,
      label: ep.label,
      status: "FAIL",
      responseTimeMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  const baseUrl = process.env.GSTOCK_API_URL
  if (!baseUrl) {
    console.error(`${RED}ERROR: GSTOCK_API_URL no configurada${RESET}`)
    process.exit(1)
  }

  console.log(`\n${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║       GStock Endpoint Healthcheck                        ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}\n`)
  console.log(`${DIM}Base URL: ${baseUrl}${RESET}`)
  console.log(`${DIM}Endpoints a testear: ${ENDPOINTS.length}${RESET}\n`)

  // Autenticación
  console.log(`${CYAN}Autenticando...${RESET}`)
  const token = await getGstockToken()
  console.log(`${GREEN}Token obtenido${RESET}\n`)

  const results: TestResult[] = []
  let currentGroup = ""

  for (const ep of ENDPOINTS) {
    if (ep.group !== currentGroup) {
      currentGroup = ep.group
      console.log(`\n${BOLD}── ${currentGroup} ──${RESET}`)
    }

    const result = await testEndpoint(ep, baseUrl, token)
    results.push(result)

    const icon =
      result.status === "OK" ? `${GREEN}✓${RESET}` :
      result.status === "SKIP" ? `${YELLOW}⊘${RESET}` :
      `${RED}✗${RESET}`

    const time = result.responseTimeMs ? `${DIM}${result.responseTimeMs}ms${RESET}` : ""
    const count = result.recordCount !== undefined ? `${DIM}(${result.recordCount} registros)${RESET}` : ""
    const err = result.error ? `${RED}${result.error}${RESET}` : ""

    console.log(`  ${icon} ${result.label.padEnd(35)} ${result.path.padEnd(45)} ${time} ${count} ${err}`)
  }

  // ─── Resumen ─────────────────────────────────────────────
  const ok = results.filter(r => r.status === "OK")
  const fail = results.filter(r => r.status === "FAIL")
  const skip = results.filter(r => r.status === "SKIP")

  console.log(`\n${BOLD}═══ RESUMEN ═══${RESET}`)
  console.log(`  ${GREEN}OK:   ${ok.length}${RESET}`)
  console.log(`  ${RED}FAIL: ${fail.length}${RESET}`)
  console.log(`  ${YELLOW}SKIP: ${skip.length}${RESET}`)
  console.log(`  Total: ${results.length}`)

  if (fail.length > 0) {
    console.log(`\n${BOLD}${RED}═══ ENDPOINTS FALLIDOS ═══${RESET}`)
    for (const f of fail) {
      console.log(`\n  ${RED}✗ ${f.label}${RESET} — ${f.path}`)
      console.log(`    HTTP ${f.httpStatus ?? "?"}: ${f.error}`)
      if (f.errorBody) {
        console.log(`    ${DIM}Body: ${f.errorBody}${RESET}`)
      }
    }
  }

  console.log("")
  process.exit(fail.length > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(`${RED}Error fatal:${RESET}`, err)
  process.exit(1)
})
