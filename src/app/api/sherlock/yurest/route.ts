import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint")

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing 'endpoint' query parameter" },
      { status: 400 }
    )
  }

  const baseUrl = process.env.YUREST_API_URL
  const token = process.env.YUREST_TOKEN

  if (!baseUrl || !token) {
    return NextResponse.json(
      { error: "Yurest API not configured. Check YUREST_API_URL and YUREST_TOKEN env vars." },
      { status: 500 }
    )
  }

  const url = `${baseUrl}/${token}/${endpoint}`

  try {
    const startTime = Date.now()

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    })

    const elapsed = Date.now() - startTime
    const data = await response.json()

    return NextResponse.json({
      ...data,
      _meta: {
        endpoint,
        httpStatus: response.status,
        responseTimeMs: elapsed,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { status: 0, message, data: [], _meta: { endpoint, error: true } },
      { status: 502 }
    )
  }
}
