"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"

// ─── Tipos de respuesta ───────────────────────────────────────

export interface KpiData {
  totalCovers: number
  totalReservations: number
  avgDailyCovers: number
  avgPartySize: number
  maxDayCovers: number
  maxDayDate: string | null
  periodDays: number
  // Deltas vs periodo anterior
  coversDelta: number | null
  avgDailyDelta: number | null
}

export interface TrendDataPoint {
  period: string
  covers: number
  reservations: number
  avgPartySize: number
}

export interface LocationComparisonPoint {
  period: string
  [restaurantName: string]: string | number
}

export interface WeekdayDistribution {
  day: string
  dayIndex: number
  covers: number
  reservations: number
  avgCovers: number
}

export interface HourlyHeatmapCell {
  dayOfWeek: number
  hour: string
  value: number
}

export type Granularity = "day" | "week" | "month"

// ─── Helpers ──────────────────────────────────────────────────

function shiftDateRange(
  start: string,
  end: string
): { prevStart: string; prevEnd: string } {
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  const prevEnd = new Date(s.getTime() - 1) // Day before start
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  return {
    prevStart: prevStart.toISOString().slice(0, 10),
    prevEnd: prevEnd.toISOString().slice(0, 10),
  }
}

const WEEKDAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]

// ─── Actions ──────────────────────────────────────────────────

export async function getAnalyticsKpis(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<KpiData> {
  await requirePermission("analytics", "read")

  const where = {
    restaurantLocationId: { in: locationIds },
    date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
  }

  const snapshots = await prisma.coverSnapshot.findMany({
    where,
    select: {
      date: true,
      totalCovers: true,
      totalReservations: true,
    },
    orderBy: { totalCovers: "desc" },
  })

  const totalCovers = snapshots.reduce((s, r) => s + r.totalCovers, 0)
  const totalReservations = snapshots.reduce(
    (s, r) => s + r.totalReservations,
    0
  )

  // Días únicos (un restaurante puede tener múltiples snapshots por fecha)
  const uniqueDays = new Set(
    snapshots.map((s) => s.date.toISOString().slice(0, 10))
  )
  const periodDays = uniqueDays.size || 1

  const avgDailyCovers = totalCovers / periodDays
  const avgPartySize =
    totalReservations > 0 ? totalCovers / totalReservations : 0

  const maxDay = snapshots[0]
  const maxDayCovers = maxDay?.totalCovers ?? 0
  const maxDayDate = maxDay?.date?.toISOString().slice(0, 10) ?? null

  // Delta vs periodo anterior
  const { prevStart, prevEnd } = shiftDateRange(dateStart, dateEnd)
  const prevSnapshots = await prisma.coverSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      date: { gte: new Date(prevStart), lte: new Date(prevEnd) },
    },
    select: { totalCovers: true, date: true },
  })

  let coversDelta: number | null = null
  let avgDailyDelta: number | null = null

  if (prevSnapshots.length > 0) {
    const prevTotal = prevSnapshots.reduce((s, r) => s + r.totalCovers, 0)
    const prevUniqueDays = new Set(
      prevSnapshots.map((s) => s.date.toISOString().slice(0, 10))
    )
    const prevDays = prevUniqueDays.size || 1
    const prevAvgDaily = prevTotal / prevDays

    coversDelta =
      prevTotal > 0
        ? ((totalCovers - prevTotal) / prevTotal) * 100
        : null
    avgDailyDelta =
      prevAvgDaily > 0
        ? ((avgDailyCovers - prevAvgDaily) / prevAvgDaily) * 100
        : null
  }

  return {
    totalCovers,
    totalReservations,
    avgDailyCovers,
    avgPartySize,
    maxDayCovers,
    maxDayDate,
    periodDays,
    coversDelta,
    avgDailyDelta,
  }
}

export async function getCoversTrend(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  granularity: Granularity
): Promise<TrendDataPoint[]> {
  await requirePermission("analytics", "read")

  const snapshots = await prisma.coverSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
    },
    select: {
      date: true,
      totalCovers: true,
      totalReservations: true,
    },
    orderBy: { date: "asc" },
  })

  // Agrupar por periodo
  const groups = new Map<
    string,
    { covers: number; reservations: number }
  >()

  for (const s of snapshots) {
    const key = periodKey(s.date, granularity)
    const existing = groups.get(key) || { covers: 0, reservations: 0 }
    existing.covers += s.totalCovers
    existing.reservations += s.totalReservations
    groups.set(key, existing)
  }

  return Array.from(groups.entries()).map(([period, data]) => ({
    period,
    covers: data.covers,
    reservations: data.reservations,
    avgPartySize:
      data.reservations > 0 ? data.covers / data.reservations : 0,
  }))
}

export async function getLocationComparison(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  granularity: Granularity
): Promise<LocationComparisonPoint[]> {
  await requirePermission("analytics", "read")

  const snapshots = await prisma.coverSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
    },
    select: {
      date: true,
      totalCovers: true,
      restaurantLocation: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  })

  const groups = new Map<string, Record<string, number>>()

  for (const s of snapshots) {
    const key = periodKey(s.date, granularity)
    const existing = groups.get(key) || {}
    const name = s.restaurantLocation.name
    existing[name] = (existing[name] || 0) + s.totalCovers
    groups.set(key, existing)
  }

  return Array.from(groups.entries()).map(([period, data]) => ({
    period,
    ...data,
  }))
}

export async function getWeekdayDistribution(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<WeekdayDistribution[]> {
  await requirePermission("analytics", "read")

  const snapshots = await prisma.coverSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
    },
    select: {
      date: true,
      totalCovers: true,
      totalReservations: true,
    },
  })

  // Agrupar por día de la semana
  const byDay = new Map<
    number,
    { covers: number; reservations: number; count: number }
  >()

  for (const s of snapshots) {
    const dow = s.date.getUTCDay() // 0=Sunday
    const existing = byDay.get(dow) || {
      covers: 0,
      reservations: 0,
      count: 0,
    }
    existing.covers += s.totalCovers
    existing.reservations += s.totalReservations
    existing.count++
    byDay.set(dow, existing)
  }

  // Reordenar: Lunes(1) ... Domingo(0)
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.map((dayIndex) => {
    const data = byDay.get(dayIndex) || {
      covers: 0,
      reservations: 0,
      count: 0,
    }
    return {
      day: WEEKDAYS_ES[dayIndex],
      dayIndex,
      covers: data.covers,
      reservations: data.reservations,
      avgCovers: data.count > 0 ? Math.round(data.covers / data.count) : 0,
    }
  })
}

export async function getServiceSplit(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<{ lunch: number; dinner: number; walkin: number }> {
  await requirePermission("analytics", "read")

  const result = await prisma.coverSnapshot.aggregate({
    where: {
      restaurantLocationId: { in: locationIds },
      date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
    },
    _sum: {
      lunchCovers: true,
      dinnerCovers: true,
      walkInCovers: true,
    },
  })

  return {
    lunch: result._sum.lunchCovers || 0,
    dinner: result._sum.dinnerCovers || 0,
    walkin: result._sum.walkInCovers || 0,
  }
}

export async function getRestaurantLocations(): Promise<
  { id: string; name: string; city: string; cmSlug: string | null; walkInToken: string | null }[]
> {
  await requirePermission("analytics", "read")
  return prisma.restaurantLocation.findMany({
    where: { isActive: true, cmSlug: { not: null } },
    select: { id: true, name: true, city: true, cmSlug: true, walkInToken: true },
    orderBy: { name: "asc" },
  })
}

export async function getLastSyncInfo() {
  await requirePermission("analytics", "read")
  return prisma.coverSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
    select: {
      status: true,
      startedAt: true,
      finishedAt: true,
      snapshotsCreated: true,
      snapshotsUpdated: true,
      errors: true,
    },
  })
}

// ─── Helpers privados ─────────────────────────────────────────

function periodKey(date: Date, granularity: Granularity): string {
  const iso = date.toISOString().slice(0, 10)
  switch (granularity) {
    case "day":
      return iso
    case "week": {
      // ISO week: lunes como primer día
      const d = new Date(date)
      const day = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - day)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      )
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
    }
    case "month":
      return iso.slice(0, 7)
  }
}
