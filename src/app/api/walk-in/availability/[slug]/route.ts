import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchCoverManagerPost, fetchCoverManagerGet } from "@/lib/covermanager"
import { classifyAvailability } from "@/modules/walk-in/domain/availability-classifier"
import { validateWalkInToken } from "@/modules/walk-in/domain/walk-in-token"
import { checkRateLimitSupabase, getClientIp } from "@/lib/rate-limit-supabase"
import type {
  CMAvailabilityResponse,
  CMTableAvailabilityResponse,
  CMMapResponse,
  CMExtendedAvailabilityResponse,
  CMStatsResponse,
  WalkInAvailability,
  ServiceAvailability,
} from "@/modules/walk-in/domain/types"

const EMPTY_OCCUPANCY = { covers: 0, totalCapacity: 0, tables: 0, totalTables: 0, percentage: 0 }

function buildEmptyServices(
  tableAvail?: CMTableAvailabilityResponse
): ServiceAvailability[] {
  const lunch = tableAvail?.availability?.lunch
  const dinner = tableAvail?.availability?.dinner
  return [
    {
      service: "lunch",
      label: "Comida",
      slots: [],
      occupancy: lunch
        ? {
            covers: lunch.num_comensales,
            totalCapacity: lunch.all_num_comensales,
            tables: lunch.tables,
            totalTables: lunch.all_tables,
            percentage: lunch.all_num_comensales > 0
              ? Math.round((lunch.num_comensales / lunch.all_num_comensales) * 100)
              : 0,
          }
        : EMPTY_OCCUPANCY,
    },
    {
      service: "dinner",
      label: "Cena",
      slots: [],
      occupancy: dinner
        ? {
            covers: dinner.num_comensales,
            totalCapacity: dinner.all_num_comensales,
            tables: dinner.tables,
            totalTables: dinner.all_tables,
            percentage: dinner.all_num_comensales > 0
              ? Math.round((dinner.num_comensales / dinner.all_num_comensales) * 100)
              : 0,
          }
        : EMPTY_OCCUPANCY,
    },
  ]
}

// ─── GET /api/walk-in/availability/[slug] ───────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now()
  const { slug } = await params

  // Validate HMAC token (blocks direct API calls without page visit)
  const walkInToken = request.headers.get("x-walkin-token") ?? ""
  if (!validateWalkInToken(walkInToken, slug)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }

  // Rate limit by IP (Supabase-backed, works across serverless instances)
  const ip = getClientIp(request)
  const allowed = await checkRateLimitSupabase({
    key: `walkin:${ip}`,
    maxRequests: 15,
    windowSeconds: 60,
  })
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  // Optional date param (default: today, limited to ±7 days)
  const dateParam = request.nextUrl.searchParams.get("date")
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  let date = todayStr

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const requested = new Date(dateParam + "T12:00:00Z")
    const diffDays = Math.abs(
      Math.round((requested.getTime() - today.getTime()) / 86_400_000)
    )
    date = diffDays <= 7 ? dateParam : todayStr
  }

  // Optional party size filter (1-20)
  const peopleParam = request.nextUrl.searchParams.get("people")
  const partySize = peopleParam ? Math.max(1, Math.min(20, parseInt(peopleParam, 10) || 0)) : undefined

  try {
    // Validate slug against DB (walkInToken first, then legacy cmSlug)
    const locationSelect = {
      id: true, name: true, address: true, city: true, cmSlug: true, lunchDinnerCutoff: true,
    } as const
    const location =
      (await prisma.restaurantLocation.findFirst({
        where: { walkInToken: slug, isActive: true },
        select: locationSelect,
      })) ??
      (await prisma.restaurantLocation.findFirst({
        where: { cmSlug: slug, isActive: true },
        select: locationSelect,
      }))

    if (!location || !location.cmSlug) {
      // Anti-enumeration: uniform delay to prevent timing oracle
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300))
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Fetch availability from CoverManager (5 parallel calls)
    const emptyTableAvail: CMTableAvailabilityResponse = {
      resp: 0,
      availability: {
        lunch: { num_comensales: 0, all_num_comensales: 0, tables: 0, all_tables: 0 },
        dinner: { num_comensales: 0, all_num_comensales: 0, tables: 0, all_tables: 0 },
      },
    }

    const [availResult, extendedResult, tableResult, mapResult, statsResult] =
      await Promise.allSettled([
        fetchCoverManagerPost<CMAvailabilityResponse>(
          "reserv/availability",
          { restaurant: location.cmSlug, date }
        ),
        fetchCoverManagerPost<CMExtendedAvailabilityResponse>(
          "apiV2/availability_extended",
          { restaurant: location.cmSlug, date, show_zones: "1", show_zones_with_id: "1" }
        ),
        fetchCoverManagerGet<CMTableAvailabilityResponse>(
          "restaurant/table_availability/:apikey/:restaurant/:date",
          { restaurant: location.cmSlug, date }
        ),
        fetchCoverManagerGet<CMMapResponse>(
          "restaurant/get_map/:apikey/:restaurant/:date/:luner",
          { restaurant: location.cmSlug, date }
        ),
        fetchCoverManagerPost<CMStatsResponse>(
          "stats/get_resumen_date",
          { restaurant: location.cmSlug, date }
        ),
      ])

    // Extract results with resp code validation
    const cmResults = { availability: "ok", extended: "ok", table: "ok", map: "ok", stats: "ok" } as Record<string, string>

    const availabilityRes = (() => {
      if (availResult.status === "rejected") {
        cmResults.availability = "fetch_error"
        return null
      }
      const v = availResult.value
      if (v.resp != null && v.resp !== 1) {
        cmResults.availability = `resp_${v.resp}`
        console.warn("[walk-in] availability resp error:", v.resp, JSON.stringify(v))
        return null
      }
      return v
    })()

    const extendedRes = (() => {
      if (extendedResult.status === "rejected") {
        cmResults.extended = "fetch_error"
        return null
      }
      return extendedResult.value
    })()

    const tableAvailRes = (() => {
      if (tableResult.status === "rejected") {
        cmResults.table = "fetch_error"
        return null
      }
      const v = tableResult.value
      if (v.resp != null && v.resp !== 1) {
        cmResults.table = `resp_${v.resp}`
        return null
      }
      return v
    })()

    const mapRes = (() => {
      if (mapResult.status === "rejected") {
        cmResults.map = "fetch_error"
        return null
      }
      if (!mapResult.value?.tables?.length) {
        cmResults.map = "empty"
        return null
      }
      return mapResult.value
    })()

    const statsRes = (() => {
      if (statsResult.status === "rejected") {
        cmResults.stats = "fetch_error"
        return null
      }
      const v = statsResult.value
      if (v.resp != null && v.resp !== 1) {
        cmResults.stats = `resp_${v.resp}`
        return null
      }
      return v
    })()

    // Build response
    const hasAvailabilityData =
      availabilityRes?.availability?.hours != null &&
      Object.keys(availabilityRes.availability.hours).length > 0

    const classifierOptions = {
      partySize,
      cutoff: location.lunchDinnerCutoff !== "17:00" ? location.lunchDinnerCutoff : undefined,
    }

    const services = hasAvailabilityData
      ? classifyAvailability(
          availabilityRes!,
          tableAvailRes ?? emptyTableAvail,
          mapRes ?? undefined,
          extendedRes ?? undefined,
          statsRes ?? undefined,
          classifierOptions
        )
      : buildEmptyServices(tableAvailRes ?? undefined)

    const responseTimeMs = Date.now() - startTime

    const result: WalkInAvailability = {
      restaurant: {
        name: location.name,
        address: location.address ?? "",
        city: location.city ?? "",
        slug: location.cmSlug,
      },
      date,
      services,
      lastUpdated: new Date().toISOString(),
      ...(partySize ? { filteredPartySize: partySize } : {}),
    }

    // Structured log
    console.log("[walk-in]", JSON.stringify({
      slug,
      date,
      people: partySize ?? "all",
      cm: cmResults,
      slots: services.reduce((acc, s) => acc + s.slots.length, 0),
      ms: responseTimeMs,
    }))

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        "X-Response-Time": `${responseTimeMs}ms`,
      },
    })
  } catch (error) {
    const responseTimeMs = Date.now() - startTime
    console.error("[walk-in/availability]", { slug, date, ms: responseTimeMs, error })
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }
}
