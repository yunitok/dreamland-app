/**
 * CoverManager Endpoint Healthcheck — Verificación de todos los endpoints
 *
 * Recorre todos los endpoints definidos en COVERMANAGER_ENDPOINT_GROUPS
 * y los llama contra la API real para verificar su estado.
 *
 * Ejecutar:
 *   npx tsx scripts/covermanager-endpoint-healthcheck.ts
 */

import "dotenv/config"

// ─── Colores ANSI ────────────────────────────────────────────────
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"

// ─── Definición de todos los endpoints a testear ─────────────────

interface EndpointTest {
  group: string
  path: string
  label: string
  method: "GET" | "POST"
  /** Para GET: params que reemplazan :placeholders */
  urlParams?: Record<string, string>
  /** Para POST: body de prueba */
  testBody?: Record<string, unknown>
  skipReason?: string
}

// Restaurante de prueba (primer slug conocido)
const TEST_RESTAURANT = "restaurante-voltereta"
const TEST_DATE = "2026-03-05"
const TEST_DATE_START = "2026-03-01"
const TEST_DATE_END = "2026-03-05"

const ENDPOINTS: EndpointTest[] = [
  // Restaurantes (GET)
  { group: "Restaurantes", path: "restaurant/list/:apikey/", label: "Listar Restaurantes", method: "GET" },
  { group: "Restaurantes", path: `restaurant/slug/:apikey/${TEST_RESTAURANT}`, label: "Restaurante por Slug", method: "GET" },
  { group: "Restaurantes", path: `restaurant/get_map/:apikey/${TEST_RESTAURANT}/${TEST_DATE}/1`, label: "Mapa de Mesas", method: "GET" },
  { group: "Restaurantes", path: `restaurant/table_availability/:apikey/${TEST_RESTAURANT}/${TEST_DATE}`, label: "Disponibilidad Mesas", method: "GET" },

  // Restaurantes (POST)
  { group: "Restaurantes", path: "restaurant/get_restaurant_by_name/:apikey", label: "Restaurante por Nombre", method: "POST", testBody: { name: "Voltereta" } },
  { group: "Restaurantes", path: "restaurant/get_restaurant_by_place/:apikey", label: "Restaurante por Lugar", method: "POST", testBody: { place: "Valencia" } },
  { group: "Restaurantes", path: "restaurant/subgroups", label: "Subgrupos", method: "POST", testBody: { company: "voltereta" } },

  // Reservas (GET)
  { group: "Reservas", path: `restaurant/get_reservs/:apikey/${TEST_RESTAURANT}/${TEST_DATE_START}/${TEST_DATE_END}/1/0`, label: "Listar Reservas (GET)", method: "GET" },

  // Reservas (POST)
  { group: "Reservas", path: "restaurant/get_reservs_basic", label: "Listar Reservas (POST)", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date_start: TEST_DATE_START, date_end: TEST_DATE_END } },

  // Disponibilidad (POST)
  { group: "Disponibilidad", path: "reserv/availability", label: "Disponibilidad", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date: TEST_DATE } },
  { group: "Disponibilidad", path: "reserv/availability_calendar", label: "Calendario Disponibilidad", method: "POST", testBody: { restaurant: TEST_RESTAURANT, people: 2 } },
  { group: "Disponibilidad", path: "reserv/availability_calendar_total", label: "Calendario Total", method: "POST", testBody: { restaurant: TEST_RESTAURANT } },
  { group: "Disponibilidad", path: "reserv/availability_message", label: "Mensaje Disponibilidad", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date: TEST_DATE, hour: "20:00", people: 2, language: "ES" } },
  { group: "Disponibilidad", path: "reserv/is_reservable", label: "Es Reservable", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date: TEST_DATE, hour: "20:00", people: 2 } },
  { group: "Disponibilidad", path: "reserv/get_zones", label: "Obtener Zonas", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date: TEST_DATE, hour: "20:00", people: 2 } },

  // Disponibilidad extendida (apiV2)
  { group: "Disponibilidad", path: "apiV2/availability_extended", label: "Disponibilidad Extendida", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date: TEST_DATE, show_zones: "1" } },

  // Clientes (POST)
  { group: "Clientes", path: "clients/clients_list", label: "Listar Clientes", method: "POST", testBody: { restaurant: TEST_RESTAURANT, page: 1 } },

  // Informes
  { group: "Informes", path: "stats/get_resumen_date", label: "Resumen por Fecha", method: "POST", testBody: { restaurant: TEST_RESTAURANT, date: TEST_DATE } },
  { group: "Informes", path: `report/get_satisfaction/:apikey/${TEST_RESTAURANT}/${TEST_DATE_START}/${TEST_DATE_END}/1`, label: "Encuestas Satisfacción", method: "GET" },

  // Pagos
  { group: "Pagos", path: "pays/get_pays", label: "Listar Pagos", method: "POST", testBody: { restaurant: TEST_RESTAURANT, pay_date_start: TEST_DATE_START, pay_date_end: TEST_DATE_END } },
  { group: "Pagos", path: "pays/get_external_pays_types", label: "Tipos Pago Externo", method: "POST", testBody: { restaurant: TEST_RESTAURANT } },
  { group: "Pagos", path: "pays/get_refunds", label: "Reembolsos", method: "POST", testBody: { restaurant: TEST_RESTAURANT, pay_date_start: TEST_DATE_START, pay_date_end: TEST_DATE_END } },
  { group: "Pagos", path: "pays/get_products", label: "Productos de Pago", method: "POST", testBody: { restaurant: TEST_RESTAURANT } },

  // Webhooks (GET)
  { group: "Webhooks", path: "webhooks/get_webhook_channel/:apikey", label: "Webhook Canal", method: "GET" },

  // Onthego
  { group: "Onthego", path: "onthego/list", label: "Listar Onthego", method: "POST", testBody: { restaurant: TEST_RESTAURANT } },

  // CoverAtHome
  { group: "CoverAtHome", path: `coverathome/get_orders/:apikey/${TEST_RESTAURANT}/${TEST_DATE}`, label: "Pedidos CoverAtHome", method: "GET" },

  // Endpoints mutantes — skip para no modificar datos
  { group: "Reservas (Write)", path: "reserv/reserv", label: "Crear Reserva", method: "POST", skipReason: "POST mutante (crea datos)" },
  { group: "Reservas (Write)", path: "reserv/update_reserv", label: "Actualizar Reserva", method: "POST", skipReason: "POST mutante (modifica datos)" },
  { group: "Reservas (Write)", path: "reserv/reserv_force", label: "Forzar Reserva", method: "POST", skipReason: "POST mutante (crea datos)" },
  { group: "Reservas (Write)", path: "reserv/walk_in", label: "Walk-in", method: "POST", skipReason: "POST mutante (crea datos)" },
  { group: "Reservas (Write)", path: "reserv/waiting_list", label: "Lista Espera", method: "POST", skipReason: "POST mutante (crea datos)" },
  { group: "Reservas (Write)", path: "reserv/cancel_client", label: "Cancelar Reserva", method: "POST", skipReason: "POST mutante (modifica datos)" },
  { group: "Estado Reservas", path: "reserv/sit_client", label: "Sentar Cliente", method: "POST", skipReason: "POST mutante" },
  { group: "Estado Reservas", path: "reserv/confirm_client", label: "Confirmar Reserva", method: "POST", skipReason: "POST mutante" },
  { group: "Estado Reservas", path: "reserv/revert_status_reserv", label: "Revertir Estado", method: "POST", skipReason: "POST mutante" },
  { group: "Estado Reservas", path: "reserv/set_ticket", label: "Establecer Ticket", method: "POST", skipReason: "POST mutante" },
  { group: "Webhooks (Write)", path: "webhooks/set_webhook_channel", label: "Configurar Webhook Canal", method: "POST", skipReason: "POST mutante (config)" },
  { group: "Webhooks (Write)", path: "webhooks/set_webhook_tpv", label: "Configurar Webhook TPV", method: "POST", skipReason: "POST mutante (config)" },
  { group: "Tags (Write)", path: "categories", label: "Crear Categoría", method: "POST", skipReason: "POST mutante (crea datos)" },
  { group: "Promo (Write)", path: "promotional_code/add_promotional_code", label: "Crear Código Promo", method: "POST", skipReason: "POST mutante (crea datos)" },
]

// ─── Test runner ─────────────────────────────────────────────────

interface TestResult {
  group: string
  path: string
  label: string
  status: "OK" | "FAIL" | "SKIP"
  httpStatus?: number
  responseTimeMs?: number
  respField?: unknown
  error?: string
  errorBody?: string
}

async function testEndpoint(
  ep: EndpointTest,
  apiKey: string
): Promise<TestResult> {
  if (ep.skipReason) {
    return { group: ep.group, path: ep.path, label: ep.label, status: "SKIP", error: ep.skipReason }
  }

  const baseUrl = "https://www.covermanager.com"

  // Construir URL
  let path = ep.path.replace(":apikey", apiKey)
  const isV2 = path.startsWith("apiV2/")
  const url = isV2 ? `${baseUrl}/${path}` : `${baseUrl}/api/${path}`

  const start = Date.now()
  try {
    const fetchOptions: RequestInit = {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        ...(ep.method === "POST" ? { apikey: apiKey } : {}),
      },
      signal: AbortSignal.timeout(15000),
    }

    if (ep.method === "POST" && ep.testBody) {
      fetchOptions.body = JSON.stringify(ep.testBody)
    }

    const res = await fetch(url, fetchOptions)
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

    return {
      group: ep.group,
      path: ep.path,
      label: ep.label,
      status: "OK",
      httpStatus: res.status,
      respField: json?.resp,
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
  const apiKey = process.env.COVERMANAGER_API_KEY
  if (!apiKey) {
    console.error(`${RED}ERROR: COVERMANAGER_API_KEY no configurada${RESET}`)
    process.exit(1)
  }

  console.log(`\n${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║       CoverManager Endpoint Healthcheck                  ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}\n`)
  console.log(`${DIM}Base URL: https://www.covermanager.com/api${RESET}`)
  console.log(`${DIM}API Key:  ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}${RESET}`)
  console.log(`${DIM}Restaurant de prueba: ${TEST_RESTAURANT}${RESET}`)
  console.log(`${DIM}Endpoints a testear: ${ENDPOINTS.length}${RESET}\n`)

  const results: TestResult[] = []
  let currentGroup = ""

  for (const ep of ENDPOINTS) {
    if (ep.group !== currentGroup) {
      currentGroup = ep.group
      console.log(`\n${BOLD}── ${currentGroup} ──${RESET}`)
    }

    const result = await testEndpoint(ep, apiKey)
    results.push(result)

    const icon =
      result.status === "OK" ? `${GREEN}✓${RESET}` :
      result.status === "SKIP" ? `${YELLOW}⊘${RESET}` :
      `${RED}✗${RESET}`

    const time = result.responseTimeMs ? `${DIM}${result.responseTimeMs}ms${RESET}` : ""
    const resp = result.respField !== undefined ? `${DIM}(resp: ${result.respField})${RESET}` : ""
    const err = result.error ? `${RED}${result.error}${RESET}` : ""

    console.log(`  ${icon} ${result.label.padEnd(35)} ${time.padEnd(20)} ${resp} ${err}`)
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
      console.log(`    ${f.error}`)
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
