import { NextRequest, NextResponse } from "next/server"

async function proxyAgora(request: NextRequest, method: "GET" | "POST") {
  const baseUrl = process.env.AGORA_API_URL
  const apiToken = process.env.AGORA_API_TOKEN

  if (!baseUrl || !apiToken) {
    return NextResponse.json(
      { error: "Agora API not configured. Check AGORA_API_URL and AGORA_API_TOKEN env vars." },
      { status: 500 }
    )
  }

  let endpoint: string | null = null
  let body: unknown = null

  if (method === "GET") {
    endpoint = request.nextUrl.searchParams.get("endpoint")
  } else {
    const json = await request.json()
    endpoint = json?.endpoint as string | null
    body = json?.body ?? null
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing 'endpoint' parameter" },
      { status: 400 }
    )
  }

  try {
    // Construir URL completa
    const cleanBase = baseUrl.replace(/\/+$/, "")
    let url = `${cleanBase}/${endpoint}`

    // Para GET, forward de query params (excepto 'endpoint')
    if (method === "GET") {
      const extraParams = new URLSearchParams()
      request.nextUrl.searchParams.forEach((value, key) => {
        if (key !== "endpoint") extraParams.set(key, value)
      })
      const qs = extraParams.toString()
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs
      }
    }

    const startTime = Date.now()

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Api-Token": apiToken,
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      },
      signal: AbortSignal.timeout(20000),
    }

    if (method === "POST" && body !== null) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)
    const elapsed = Date.now() - startTime

    const text = await response.text()
    let data: unknown = {}
    try {
      data = JSON.parse(text)
    } catch {
      data = { rawResponse: text.slice(0, 5000) }
    }

    return NextResponse.json({
      data,
      _meta: {
        endpoint,
        method,
        httpStatus: response.status,
        responseTimeMs: elapsed,
        timestamp: new Date().toISOString(),
        apiVersion: response.headers.get("Api-Version") ?? undefined,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { data: null, error: message, _meta: { endpoint, method, error: true } },
      { status: 502 }
    )
  }
}

export async function GET(request: NextRequest) {
  return proxyAgora(request, "GET")
}

export async function POST(request: NextRequest) {
  return proxyAgora(request, "POST")
}
