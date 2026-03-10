import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchCoverManagerPost, fetchCoverManagerGet } from "@/lib/covermanager"
import { classifyAvailability } from "@/modules/walk-in/domain/availability-classifier"
import type {
  CMAvailabilityResponse,
  CMTableAvailabilityResponse,
  WalkInAvailability,
  ServiceAvailability,
} from "@/modules/walk-in/domain/types"

// ─── Simple in-memory rate limiter ──────────────────────────────
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// Clean stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanupKey = "__walkin_rate_cleanup"
  if (!(globalThis as Record<string, unknown>)[cleanupKey]) {
    ;(globalThis as Record<string, unknown>)[cleanupKey] = setInterval(() => {
      const now = Date.now()
      for (const [ip, entry] of rateLimit) {
        if (now > entry.resetAt) rateLimit.delete(ip)
      }
    }, 300_000)
  }
}

// ─── Simple in-memory cache ─────────────────────────────────────
const cache = new Map<string, { data: WalkInAvailability; expiresAt: number }>()
const CACHE_TTL_MS = 45_000 // 45 seconds

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
  const { slug } = await params

  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  // Optional date param (default: today)
  const dateParam = request.nextUrl.searchParams.get("date")
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toISOString().split("T")[0]

  // Check cache
  const cacheKey = `${slug}:${date}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        "X-Cache": "HIT",
      },
    })
  }

  try {
    // Validate slug against DB
    const location = await prisma.restaurantLocation.findFirst({
      where: { cmSlug: slug, isActive: true },
      select: { id: true, name: true, address: true, city: true, cmSlug: true },
    })

    if (!location || !location.cmSlug) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }

    // Fetch availability from CoverManager
    let availabilityRes: CMAvailabilityResponse | null = null
    let tableAvailRes: CMTableAvailabilityResponse | null = null

    try {
      availabilityRes = await fetchCoverManagerPost<CMAvailabilityResponse>(
        "reserv/availability",
        { restaurant: location.cmSlug, date }
      )
    } catch (err) {
      console.error("[walk-in] availability fetch error:", err)
    }

    try {
      tableAvailRes = await fetchCoverManagerGet<CMTableAvailabilityResponse>(
        "restaurant/table_availability/:apikey/:restaurant/:date",
        { restaurant: location.cmSlug, date }
      )
    } catch (err) {
      console.error("[walk-in] table_availability fetch error:", err)
    }

    // Build response
    const hasAvailabilityData =
      availabilityRes?.availability?.hours != null &&
      Object.keys(availabilityRes.availability.hours).length > 0

    const services = hasAvailabilityData
      ? classifyAvailability(availabilityRes!, tableAvailRes ?? { resp: 0, availability: { lunch: { num_comensales: 0, all_num_comensales: 0, tables: 0, all_tables: 0 }, dinner: { num_comensales: 0, all_num_comensales: 0, tables: 0, all_tables: 0 } } })
      : buildEmptyServices(tableAvailRes ?? undefined)

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
    }

    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        "X-Cache": "MISS",
      },
    })
  } catch (error) {
    console.error("[walk-in/availability]", error)
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }
}
