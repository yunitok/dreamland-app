/**
 * GStock Full API Audit — Testea TODOS los endpoints de la OpenAPI spec
 *
 * Incluye endpoints que no teníamos, POST con body vacío para descubrir requisitos,
 * y endpoints que devolvían 404/403 para verificar si necesitan params.
 *
 * Ejecutar:
 *   npx tsx scripts/gstock-full-audit.ts
 */

import "dotenv/config"
import { getGstockToken } from "../src/lib/gstock"

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"

interface EndpointTest {
  group: string
  path: string
  label: string
  method: "GET" | "POST"
  testParams?: Record<string, string>
  testBody?: unknown
  note?: string
}

const ENDPOINTS: EndpointTest[] = [
  // ═══ ENDPOINTS QUE YA TENEMOS (verificación) ═══

  // Productos & Compras
  { group: "Productos & Compras", path: "v1/product/purchases", label: "Productos de Compra", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/categories", label: "Categorías Productos", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/families", label: "Familias", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/types", label: "Tipos", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/subtypes", label: "Subtipos", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/units/measure", label: "Unidades Medida", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/units/display", label: "Unidades Display", method: "GET" },
  { group: "Productos & Compras", path: "v1/product/purchases/formats", label: "Formatos", method: "GET" },

  // Proveedores
  { group: "Proveedores", path: "v1/suppliers", label: "Proveedores", method: "GET" },
  { group: "Proveedores", path: "v1/suppliers/accounting", label: "Contab. Proveedores", method: "GET" },
  { group: "Proveedores", path: "v1/suppliers/category", label: "Cat. Proveedores", method: "GET" },
  { group: "Proveedores", path: "v1/suppliers/subcategory", label: "Subcat. Proveedores", method: "GET" },

  // Pedidos & Albaranes
  { group: "Pedidos", path: "v1/order/purchases", label: "Pedidos Compra", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos", path: "v1/delivery/purchases", label: "Albaranes Compra", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos", path: "v1/delivery/purchases/accounting", label: "Contab. Albaranes", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos", path: "v1/invoices/purchases", label: "Facturas Compra", method: "GET", testParams: { fromDate: "2025-01-01", toDate: "2025-12-31" } },
  { group: "Pedidos", path: "v1/transfers", label: "Transferencias", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Pedidos", path: "v1/inventories", label: "Inventarios", method: "GET", testParams: { startDate: "2025-01-01" } },

  // Cocina & Recetas
  { group: "Cocina", path: "v2/recipes", label: "Recetas v2", method: "GET" },
  { group: "Cocina", path: "v1/recipes", label: "Recetas v1", method: "GET" },
  { group: "Cocina", path: "v1/recipes/categories", label: "Cat. Recetas", method: "GET" },
  { group: "Cocina", path: "v1/recipes/families", label: "Fam. Recetas", method: "GET" },
  { group: "Cocina", path: "v1/subrecipes/units", label: "Uds. Subrecetas", method: "GET" },
  { group: "Cocina", path: "v1/productionOrder/subrecipe", label: "Prod. Subrecetas", method: "GET" },

  // Ventas & POS
  { group: "Ventas & POS", path: "v1/plus", label: "PLUs", method: "GET", testParams: { pageNumber: "1", pageSize: "50" } },
  { group: "Ventas & POS", path: "v1/invoices/sales/accounting", label: "Fact. Venta", method: "GET", note: "HTTP 403 anterior" },
  { group: "Ventas & POS", path: "v1/articles/sales", label: "Artículos Venta", method: "GET", note: "HTTP 403 anterior" },
  { group: "Ventas & POS", path: "v1/articles/sales/resulting-units", label: "Uds. Resultantes", method: "GET", note: "HTTP 403 anterior" },

  // Informes
  { group: "Informes", path: "v1/costReals", label: "Coste Real", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costReals/items", label: "Coste Real Items", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/costTheoreticals", label: "Coste Teórico", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/stockVariations", label: "Var. Stock", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/stockVariations/items", label: "Var. Stock Items", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/stockTheoreticals", label: "Stock Teórico", method: "GET", testParams: { date: "2025-06-01", centerId: "1" } },
  { group: "Informes", path: "v1/priceVariation/products", label: "Var. Precios Prod.", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/priceVariation/recipes", label: "Var. Precios Recetas", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "Informes", path: "v1/report/sales", label: "Reporte Ventas", method: "GET", testParams: { reportType: "1", currencyCode: "EUR", centerId: "1", startDate: "2025-01-01" } },

  // Mermas (GET)
  { group: "Mermas", path: "v1/shrinkages/causes", label: "Causas Merma", method: "GET" },
  { group: "Mermas", path: "v1/shrinkages/products", label: "Mermas Productos", method: "GET", testParams: { startDate: "2025-01-01" } },
  { group: "Mermas", path: "v1/shrinkages/recipes", label: "Mermas Recetas", method: "GET", testParams: { startDate: "2025-01-01" } },

  // Organización
  { group: "Organización", path: "v1/centers", label: "Centros", method: "GET" },
  { group: "Organización", path: "v1/centers/groups", label: "Grupos Centros", method: "GET" },
  { group: "Organización", path: "v1/payment-methods", label: "Métodos Pago", method: "GET" },

  // ═══ ENDPOINTS NUEVOS DE LA OPENAPI SPEC ═══

  // Informes — Coste Real (desglosados)
  { group: "NUEVO: Informes", path: "v1/costReals/categories", label: "Coste Real Categorías", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "NUEVO: Informes", path: "v1/costReals/families", label: "Coste Real Familias", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "NUEVO: Informes", path: "v1/costReals/types", label: "Coste Real Tipos", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "NUEVO: Informes", path: "v1/costReals/subtypes", label: "Coste Real Subtipos", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "NUEVO: Informes", path: "v1/costReals/subtypes/accounting", label: "Coste Real Subtipos Contab.", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "NUEVO: Informes", path: "v1/costReals/category/accounting", label: "Coste Real Cat. Contab.", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },

  // Informes — Coste Teórico (desglosados)
  { group: "NUEVO: Informes", path: "v1/costTheoreticals/carte/items", label: "Coste Teórico Carta", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },
  { group: "NUEVO: Informes", path: "v1/costTheoreticals/packs/items", label: "Coste Teórico Packs", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },

  // Informes — Variación precios
  { group: "NUEVO: Informes", path: "v1/priceVariation/formats", label: "Var. Precios Formatos", method: "GET", testParams: { centerId: "1", startDate: "2025-01-01" } },

  // Stock Teórico
  { group: "NUEVO: Informes", path: "v1/stockTheoreticals/subrecipe-semifinished", label: "Stock Teórico Subrecetas", method: "GET", testParams: { date: "2025-06-01", centerId: "1" } },

  // Facturas compra (adicionales)
  { group: "NUEVO: Facturas", path: "v1/invoices/purchases/accounting", label: "Fact. Compra Contab.", method: "GET", testParams: { fromDate: "2025-01-01", toDate: "2025-12-31" } },
  { group: "NUEVO: Facturas", path: "v1/invoices/purchases/recordAccounting", label: "Fact. Compra Reg. Contab.", method: "GET", testParams: { fromDate: "2025-01-01", toDate: "2025-12-31" } },

  // Producción
  { group: "NUEVO: Producción", path: "v1/productionOrder/articles/sales", label: "Prod. Artículos Venta", method: "GET" },

  // POS Categories (estaba 404 pero está en la spec)
  { group: "NUEVO: POS", path: "v1/pos/categories", label: "Categorías POS", method: "GET", note: "HTTP 404 anterior" },
  // Probar con paginación
  { group: "NUEVO: POS", path: "v1/pos/categories", label: "Cat. POS (paginado)", method: "GET", testParams: { pageNumber: "1", pageSize: "50" }, note: "retry con paginación" },

  // Imports
  { group: "NUEVO: Integrations", path: "v1/imports", label: "Importaciones", method: "GET" },

  // ═══ POST ENDPOINTS ═══

  // Ventas POS (POST) — probamos con body vacío para ver qué pide
  { group: "POST: Ventas", path: "v1/pos/loader/sales/json/realtime", label: "Ventas Tiempo Real", method: "POST", testBody: {} },
  { group: "POST: Ventas", path: "v1/pos/loader/sales/json", label: "Carga Ventas", method: "POST", testBody: {} },

  // Mermas (POST) — crear mermas
  { group: "POST: Mermas", path: "v1/shrinkages/format", label: "Crear Merma Formato", method: "POST", testBody: {} },
  { group: "POST: Mermas", path: "v1/shrinkages/recipe", label: "Crear Merma Receta", method: "POST", testBody: {} },
  { group: "POST: Mermas", path: "v1/shrinkages/subrecipe", label: "Crear Merma Subreceta", method: "POST", testBody: {} },
  { group: "POST: Mermas", path: "v1/shrinkages/product", label: "Crear Merma Producto", method: "POST", testBody: {} },
  { group: "POST: Mermas", path: "v1/shrinkages/article", label: "Crear Merma Artículo", method: "POST", testBody: {} },
]

interface TestResult {
  group: string
  path: string
  label: string
  method: string
  status: "OK" | "FAIL" | "WARN"
  httpStatus?: number
  recordCount?: number
  responseTimeMs?: number
  message?: string
  responseBody?: string
  note?: string
}

async function testEndpoint(
  ep: EndpointTest,
  baseUrl: string,
  token: string
): Promise<TestResult> {
  const params = new URLSearchParams(ep.testParams ?? {})
  const qs = params.toString()
  const url = `${baseUrl}/${ep.path}${qs ? `?${qs}` : ""}`

  const start = Date.now()
  try {
    const fetchOptions: RequestInit = {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    }

    if (ep.method === "POST" && ep.testBody !== undefined) {
      fetchOptions.body = JSON.stringify(ep.testBody)
    }

    const res = await fetch(url, fetchOptions)
    const elapsed = Date.now() - start
    const body = await res.text()
    let json: Record<string, unknown> | null = null
    try { json = JSON.parse(body) } catch { /* no-json */ }

    if (!res.ok) {
      const msg = json?.message ?? json?.error ?? res.statusText
      // 403 y 404 son "esperados" para algunos endpoints — marcar como WARN
      const status = (res.status === 403 || res.status === 404) ? "WARN" as const : "FAIL" as const
      return {
        group: ep.group, path: ep.path, label: ep.label, method: ep.method,
        status,
        httpStatus: res.status,
        responseTimeMs: elapsed,
        message: `HTTP ${res.status}: ${msg}`,
        responseBody: body.slice(0, 500),
        note: ep.note,
      }
    }

    const data = json?.data
    const recordCount = Array.isArray(data) ? data.length : data ? 1 : 0

    return {
      group: ep.group, path: ep.path, label: ep.label, method: ep.method,
      status: "OK",
      httpStatus: res.status,
      recordCount,
      responseTimeMs: elapsed,
      note: ep.note,
    }
  } catch (err) {
    return {
      group: ep.group, path: ep.path, label: ep.label, method: ep.method,
      status: "FAIL",
      responseTimeMs: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
      note: ep.note,
    }
  }
}

async function main() {
  const baseUrl = process.env.GSTOCK_API_URL
  if (!baseUrl) {
    console.error(`${RED}ERROR: GSTOCK_API_URL no configurada${RESET}`)
    process.exit(1)
  }

  console.log(`\n${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║       GStock Full API Audit (vs OpenAPI Spec)                ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`)
  console.log(`${DIM}Base URL: ${baseUrl}${RESET}`)
  console.log(`${DIM}Endpoints a testear: ${ENDPOINTS.length}${RESET}\n`)

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
      result.status === "WARN" ? `${YELLOW}⚠${RESET}` :
      `${RED}✗${RESET}`

    const method = result.method === "POST" ? `${YELLOW}POST${RESET}` : `${DIM}GET${RESET}`
    const time = result.responseTimeMs ? `${DIM}${result.responseTimeMs}ms${RESET}` : ""
    const count = result.recordCount !== undefined ? `${DIM}(${result.recordCount} reg)${RESET}` : ""
    const msg = result.message ? `${RED}${result.message}${RESET}` : ""
    const note = result.note ? `${DIM}[${result.note}]${RESET}` : ""

    console.log(`  ${icon} ${method} ${result.label.padEnd(32)} ${result.path.padEnd(48)} ${time} ${count} ${msg} ${note}`)
  }

  // Resumen
  const ok = results.filter(r => r.status === "OK")
  const fail = results.filter(r => r.status === "FAIL")
  const warn = results.filter(r => r.status === "WARN")

  console.log(`\n${BOLD}═══ RESUMEN ═══${RESET}`)
  console.log(`  ${GREEN}OK:   ${ok.length}${RESET}`)
  console.log(`  ${RED}FAIL: ${fail.length}${RESET}`)
  console.log(`  ${YELLOW}WARN: ${warn.length}${RESET} (403/404)`)
  console.log(`  Total: ${results.length}`)

  // Detalle de fallos y warnings
  if (fail.length > 0) {
    console.log(`\n${BOLD}${RED}═══ FAIL (requieren corrección) ═══${RESET}`)
    for (const f of fail) {
      console.log(`\n  ${RED}✗ [${f.method}] ${f.label}${RESET} — ${f.path}`)
      console.log(`    ${f.message}`)
      if (f.responseBody) console.log(`    ${DIM}Body: ${f.responseBody.slice(0, 200)}${RESET}`)
    }
  }

  if (warn.length > 0) {
    console.log(`\n${BOLD}${YELLOW}═══ WARN (403/404) ═══${RESET}`)
    for (const w of warn) {
      console.log(`  ${YELLOW}⚠ [${w.method}] ${w.label}${RESET} — ${w.path}: ${w.message}`)
    }
  }

  // Endpoints nuevos que funcionaron
  const newOk = ok.filter(r => r.group.startsWith("NUEVO"))
  if (newOk.length > 0) {
    console.log(`\n${BOLD}${GREEN}═══ ENDPOINTS NUEVOS QUE FUNCIONAN ═══${RESET}`)
    for (const n of newOk) {
      console.log(`  ${GREEN}✓${RESET} ${n.path} — ${n.recordCount} registros`)
    }
  }

  // POST endpoints — detalle de respuestas para entender body requerido
  const postResults = results.filter(r => r.method === "POST")
  if (postResults.length > 0) {
    console.log(`\n${BOLD}${CYAN}═══ POST ENDPOINTS — Detalle ═══${RESET}`)
    for (const p of postResults) {
      console.log(`\n  ${p.status === "OK" ? GREEN : p.status === "WARN" ? YELLOW : RED}[${p.httpStatus}]${RESET} ${p.path}`)
      if (p.responseBody) {
        console.log(`    ${DIM}${p.responseBody.slice(0, 400)}${RESET}`)
      }
    }
  }

  console.log("")
}

main().catch(err => {
  console.error(`${RED}Error fatal:${RESET}`, err)
  process.exit(1)
})
