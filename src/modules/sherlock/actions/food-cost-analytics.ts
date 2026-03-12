"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"
import type { Granularity } from "@/modules/analytics/actions/cover-analytics"

// ─── Tipos de respuesta ───────────────────────────────────────

export interface FoodCostKpiData {
  realCostTotal: number
  theoreticalCostTotal: number
  variance: number
  variancePercent: number
  foodCostPercent: number | null
  theoreticalFoodCostPercent: number | null
  totalRevenue: number
  periodMonths: number
  // Deltas vs periodo anterior
  realCostDelta: number | null
  foodCostPercentDelta: number | null
}

export interface FoodCostTrendPoint {
  period: string
  realCost: number
  theoreticalCost: number
  revenue: number
  foodCostPercent: number | null
}

export interface CategoryCostPoint {
  name: string
  amount: number
}

export interface VarianceItemPoint {
  locationName: string
  realCost: number
  theoreticalCost: number
  variance: number
  variancePercent: number
  foodCostPercent: number | null
}

// ─── Helpers ──────────────────────────────────────────────────

function shiftDateRange(
  start: string,
  end: string
): { prevStart: Date; prevEnd: Date } {
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  const prevEnd = new Date(s.getTime() - 86400000) // Day before start
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  return { prevStart, prevEnd }
}

// ─── KPIs ─────────────────────────────────────────────────────

export async function getFoodCostKpis(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<FoodCostKpiData> {
  await requirePermission("sherlock", "read")

  const where = {
    restaurantLocationId: { in: locationIds },
    periodStart: { gte: new Date(dateStart) },
    periodEnd: { lte: new Date(dateEnd) },
  }

  const agg = await prisma.foodCostSnapshot.aggregate({
    where,
    _sum: {
      realCostTotal: true,
      theoreticalCostTotal: true,
      variance: true,
      periodRevenue: true,
    },
    _count: true,
  })

  const realCostTotal = agg._sum.realCostTotal ?? 0
  const theoreticalCostTotal = agg._sum.theoreticalCostTotal ?? 0
  const totalRevenue = agg._sum.periodRevenue ?? 0
  const variance = agg._sum.variance ?? 0
  const variancePercent =
    theoreticalCostTotal !== 0
      ? Math.round(((realCostTotal - theoreticalCostTotal) / theoreticalCostTotal) * 10000) / 100
      : 0
  const foodCostPercent =
    totalRevenue > 0
      ? Math.round((realCostTotal / totalRevenue) * 10000) / 100
      : null
  const theoreticalFoodCostPercent =
    totalRevenue > 0
      ? Math.round((theoreticalCostTotal / totalRevenue) * 10000) / 100
      : null

  // Delta vs periodo anterior
  const { prevStart, prevEnd } = shiftDateRange(dateStart, dateEnd)
  const prevAgg = await prisma.foodCostSnapshot.aggregate({
    where: {
      restaurantLocationId: { in: locationIds },
      periodStart: { gte: prevStart },
      periodEnd: { lte: prevEnd },
    },
    _sum: {
      realCostTotal: true,
      periodRevenue: true,
    },
  })

  const prevReal = prevAgg._sum.realCostTotal ?? 0
  const prevRevenue = prevAgg._sum.periodRevenue ?? 0
  const prevFoodCost =
    prevRevenue > 0 ? (prevReal / prevRevenue) * 100 : null

  const realCostDelta =
    prevReal > 0
      ? Math.round(((realCostTotal - prevReal) / prevReal) * 1000) / 10
      : null

  const foodCostPercentDelta =
    foodCostPercent !== null && prevFoodCost !== null
      ? Math.round((foodCostPercent - prevFoodCost) * 10) / 10
      : null

  return {
    realCostTotal,
    theoreticalCostTotal,
    variance,
    variancePercent,
    foodCostPercent,
    theoreticalFoodCostPercent,
    totalRevenue,
    periodMonths: agg._count,
    realCostDelta,
    foodCostPercentDelta,
  }
}

// ─── Tendencia ────────────────────────────────────────────────

export async function getFoodCostTrend(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  _granularity: Granularity
): Promise<FoodCostTrendPoint[]> {
  await requirePermission("sherlock", "read")

  // Los snapshots ya son mensuales, así que agrupamos por periodStart
  const snapshots = await prisma.foodCostSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      periodStart: { gte: new Date(dateStart) },
      periodEnd: { lte: new Date(dateEnd) },
    },
    orderBy: { periodStart: "asc" },
  })

  // Agrupar por periodStart (mes)
  const byPeriod = new Map<
    string,
    { real: number; theoretical: number; revenue: number }
  >()

  for (const s of snapshots) {
    const key = s.periodStart.toISOString().slice(0, 7) // YYYY-MM
    const existing = byPeriod.get(key) ?? { real: 0, theoretical: 0, revenue: 0 }
    existing.real += s.realCostTotal
    existing.theoretical += s.theoreticalCostTotal
    existing.revenue += s.periodRevenue ?? 0
    byPeriod.set(key, existing)
  }

  return Array.from(byPeriod.entries()).map(([period, data]) => ({
    period,
    realCost: Math.round(data.real * 100) / 100,
    theoreticalCost: Math.round(data.theoretical * 100) / 100,
    revenue: Math.round(data.revenue * 100) / 100,
    foodCostPercent:
      data.revenue > 0
        ? Math.round((data.real / data.revenue) * 10000) / 100
        : null,
  }))
}

// ─── Desglose por categoría ───────────────────────────────────

export async function getFoodCostByCategory(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<CategoryCostPoint[]> {
  await requirePermission("sherlock", "read")

  const snapshots = await prisma.foodCostSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      periodStart: { gte: new Date(dateStart) },
      periodEnd: { lte: new Date(dateEnd) },
    },
    select: { realCostByCategory: true },
  })

  const categoryMap = new Map<string, number>()

  for (const s of snapshots) {
    const categories = s.realCostByCategory as
      | { name: string; amount: number }[]
      | null
    if (!categories) continue
    for (const cat of categories) {
      categoryMap.set(cat.name, (categoryMap.get(cat.name) ?? 0) + cat.amount)
    }
  }

  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ─── Comparativa por local ────────────────────────────────────

export async function getFoodCostByLocation(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<VarianceItemPoint[]> {
  await requirePermission("sherlock", "read")

  const locations = await prisma.restaurantLocation.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(locations.map((l) => [l.id, l.name]))

  const snapshots = await prisma.foodCostSnapshot.findMany({
    where: {
      restaurantLocationId: { in: locationIds },
      periodStart: { gte: new Date(dateStart) },
      periodEnd: { lte: new Date(dateEnd) },
    },
  })

  // Agrupar por location
  const byLocation = new Map<
    string,
    { real: number; theoretical: number; revenue: number }
  >()

  for (const s of snapshots) {
    const existing = byLocation.get(s.restaurantLocationId) ?? {
      real: 0,
      theoretical: 0,
      revenue: 0,
    }
    existing.real += s.realCostTotal
    existing.theoretical += s.theoreticalCostTotal
    existing.revenue += s.periodRevenue ?? 0
    byLocation.set(s.restaurantLocationId, existing)
  }

  return Array.from(byLocation.entries())
    .map(([locId, data]) => {
      const variance = data.real - data.theoretical
      return {
        locationName: nameMap.get(locId) ?? locId,
        realCost: Math.round(data.real * 100) / 100,
        theoreticalCost: Math.round(data.theoretical * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent:
          data.theoretical !== 0
            ? Math.round((variance / data.theoretical) * 10000) / 100
            : 0,
        foodCostPercent:
          data.revenue > 0
            ? Math.round((data.real / data.revenue) * 10000) / 100
            : null,
      }
    })
    .sort((a, b) => b.variance - a.variance)
}
