import { NextRequest, NextResponse } from "next/server"
import { getGstockToken } from "@/lib/gstock"

async function proxyToGstock(request: NextRequest, method: "GET" | "POST") {
  const endpoint = method === "GET"
    ? request.nextUrl.searchParams.get("endpoint")
    : null

  // Para POST, el endpoint viene en el body
  let body: Record<string, unknown> | null = null
  let postEndpoint: string | null = null

  if (method === "POST") {
    body = await request.json()
    postEndpoint = body?.endpoint as string | null
    delete body?.endpoint
  }

  const resolvedEndpoint = endpoint ?? postEndpoint

  if (!resolvedEndpoint) {
    return NextResponse.json(
      { error: "Missing 'endpoint' parameter" },
      { status: 400 }
    )
  }

  const baseUrl = process.env.GSTOCK_API_URL

  if (!baseUrl) {
    return NextResponse.json(
      { error: "GStock API not configured. Check GSTOCK_API_URL, GSTOCK_CLIENT_ID and GSTOCK_CLIENT_SECRET env vars." },
      { status: 500 }
    )
  }

  try {
    const token = await getGstockToken()

    // Forward de query params adicionales (excepto 'endpoint') a GStock
    const extraParams = new URLSearchParams()
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "endpoint") extraParams.set(key, value)
    })
    const queryString = extraParams.toString()
    const url = `${baseUrl}/${resolvedEndpoint}${queryString ? `?${queryString}` : ""}`
    const startTime = Date.now()

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    }

    if (method === "POST" && body) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)
    const elapsed = Date.now() - startTime

    // Intentar parsear como JSON; si falla, devolver texto
    const text = await response.text()
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(text)
    } catch {
      data = { rawResponse: text }
    }

    return NextResponse.json({
      ...data,
      _meta: {
        endpoint: resolvedEndpoint,
        method,
        httpStatus: response.status,
        responseTimeMs: elapsed,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { status: 0, message, data: [], _meta: { endpoint: resolvedEndpoint, method, error: true } },
      { status: 502 }
    )
  }
}

export async function GET(request: NextRequest) {
  return proxyToGstock(request, "GET")
}

export async function POST(request: NextRequest) {
  return proxyToGstock(request, "POST")
}
