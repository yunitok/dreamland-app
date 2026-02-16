import { NextRequest, NextResponse } from "next/server"
import { getGstockToken } from "@/lib/gstock"

export async function GET(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint")

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing 'endpoint' query parameter" },
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
    const url = `${baseUrl}/${endpoint}`
    const startTime = Date.now()

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
