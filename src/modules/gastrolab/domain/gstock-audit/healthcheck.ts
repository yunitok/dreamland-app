import { fetchGstock, GSTOCK_ENDPOINT_GROUPS } from "@/lib/gstock"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EndpointHealthResult {
  endpoint: string
  label: string
  status: "OK" | "ERROR" | "TIMEOUT" | "AUTH_FAILED"
  httpStatus?: number
  responseTimeMs: number
  recordCount?: number
  error?: string
}

export interface HealthcheckReport {
  total: number
  ok: number
  failed: number
  avgResponseTimeMs: number
  results: EndpointHealthResult[]
  message: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 5

/**
 * Filtra los endpoints GET sin requiredParams (los que se pueden testear sin
 * datos reales).
 */
export function getTestableEndpoints(): Array<{ path: string; label: string }> {
  return GSTOCK_ENDPOINT_GROUPS.flatMap((group) =>
    group.endpoints
      .filter((ep) => ep.method === "GET" && !ep.requiredParams)
      .map(({ path, label }) => ({ path, label })),
  )
}

/**
 * Determina el status a partir del mensaje de error.
 */
function classifyError(msg: string): "TIMEOUT" | "AUTH_FAILED" | "ERROR" {
  const lower = msg.toLowerCase()

  if (lower.includes("timeout") || lower.includes("aborterror")) {
    return "TIMEOUT"
  }

  if (lower.includes("401") || lower.includes("403")) {
    return "AUTH_FAILED"
  }

  return "ERROR"
}

/**
 * Extrae el codigo HTTP del mensaje de error si sigue el patron
 * "HTTP NNN" generado por fetchGstock.
 */
function extractHttpStatus(msg: string): number | undefined {
  const match = msg.match(/HTTP\s+(\d{3})/)
  return match ? Number(match[1]) : undefined
}

// ---------------------------------------------------------------------------
// Test de un endpoint individual
// ---------------------------------------------------------------------------

export async function testSingleEndpoint(
  path: string,
  label: string,
): Promise<EndpointHealthResult> {
  const start = Date.now()

  try {
    const response = await fetchGstock(path)
    const responseTimeMs = Date.now() - start

    return {
      endpoint: path,
      label,
      status: "OK",
      responseTimeMs,
      recordCount: response.data.length,
    }
  } catch (err) {
    const responseTimeMs = Date.now() - start
    const message = err instanceof Error ? err.message : String(err)
    const status = classifyError(message)

    return {
      endpoint: path,
      label,
      status,
      httpStatus: extractHttpStatus(message),
      responseTimeMs,
      error: message,
    }
  }
}

// ---------------------------------------------------------------------------
// Healthcheck completo
// ---------------------------------------------------------------------------

export async function runGstockHealthcheck(): Promise<HealthcheckReport> {
  const endpoints = getTestableEndpoints()
  const results: EndpointHealthResult[] = []

  for (let i = 0; i < endpoints.length; i += BATCH_SIZE) {
    const batch = endpoints.slice(i, i + BATCH_SIZE)
    const settled = await Promise.allSettled(
      batch.map((ep) => testSingleEndpoint(ep.path, ep.label)),
    )

    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value)
      } else {
        // No deberia ocurrir porque testSingleEndpoint captura errores,
        // pero protegemos igualmente.
        results.push({
          endpoint: "unknown",
          label: "unknown",
          status: "ERROR",
          responseTimeMs: 0,
          error: String(outcome.reason),
        })
      }
    }
  }

  const ok = results.filter((r) => r.status === "OK").length
  const failed = results.length - ok
  const totalTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0)
  const avgResponseTimeMs =
    results.length > 0 ? Math.round(totalTime / results.length) : 0

  const message =
    failed === 0
      ? `Todos los ${ok} endpoints responden correctamente.`
      : `${ok}/${results.length} endpoints OK, ${failed} con errores.`

  return {
    total: results.length,
    ok,
    failed,
    avgResponseTimeMs,
    results,
    message,
  }
}
