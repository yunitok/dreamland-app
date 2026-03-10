import { NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://www.covermanager.com"

async function proxyCoverManager(request: NextRequest, method: "GET" | "POST") {
  const apiKey = process.env.COVERMANAGER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "CoverManager API not configured. Check COVERMANAGER_API_KEY env var." },
      { status: 500 }
    )
  }

  let endpoint: string | null = null
  let body: Record<string, unknown> | null = null

  if (method === "GET") {
    endpoint = request.nextUrl.searchParams.get("endpoint")
  } else {
    body = await request.json()
    endpoint = body?.endpoint as string | null
    delete body?.endpoint
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing 'endpoint' parameter" },
      { status: 400 }
    )
  }

  try {
    // Reemplazar :apikey en la ruta y limpiar :params opcionales no rellenados
    let path = endpoint.replace(":apikey", apiKey)
    path = path.replace(/\/:[a-zA-Z_]+/g, "").replace(/\/+$/, "")

    // Determinar si es /api/ o /apiV2/
    const isV2 = path.startsWith("apiV2/")
    const url = isV2 ? `${BASE_URL}/${path}` : `${BASE_URL}/api/${path}`

    const startTime = Date.now()

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(method === "POST" ? { apikey: apiKey } : {}),
      },
      signal: AbortSignal.timeout(15000),
    }

    if (method === "POST" && body) {
      fetchOptions.body = JSON.stringify(body)
    }

    // Forward de query params adicionales (excepto 'endpoint')
    if (method === "GET") {
      const extraParams = new URLSearchParams()
      request.nextUrl.searchParams.forEach((value, key) => {
        if (key !== "endpoint") extraParams.set(key, value)
      })
      const qs = extraParams.toString()
      if (qs) {
        const separator = url.includes("?") ? "&" : "?"
        Object.assign(fetchOptions, { url: `${url}${separator}${qs}` })
      }
    }

    const response = await fetch(url, fetchOptions)
    const elapsed = Date.now() - startTime

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
        endpoint,
        method,
        httpStatus: response.status,
        responseTimeMs: elapsed,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { resp: 0, message, _meta: { endpoint, method, error: true } },
      { status: 502 }
    )
  }
}

export async function GET(request: NextRequest) {
  return proxyCoverManager(request, "GET")
}

export async function POST(request: NextRequest) {
  return proxyCoverManager(request, "POST")
}
