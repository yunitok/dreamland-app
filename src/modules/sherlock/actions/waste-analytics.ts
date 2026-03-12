"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"

// ─── Tipos de respuesta ───────────────────────────────────────

export interface WasteKpiData {
  totalQuantity: number
  totalCostImpact: number
  totalRecords: number
  avgQuantityPerRecord: number
  // Delta vs periodo anterior
  costDelta: number | null
}

export interface WasteTrendPoint {
  period: string
  quantity: number
  costImpact: number
  records: number
}

export interface WasteByReasonPoint {
  reason: string
  quantity: number
  costImpact: number
  count: number
}

export interface WasteByIngredientPoint {
  ingredientName: string
  quantity: number
  costImpact: number
  unitAbbreviation: string
  count: number
}

// ─── KPIs ─────────────────────────────────────────────────────

export async function getWasteKpis(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<WasteKpiData> {
  await requirePermission("sherlock", "read")

  const where = {
    createdAt: {
      gte: new Date(dateStart),
      lte: new Date(dateEnd + "T23:59:59"),
    },
    ...(locationIds.length > 0 && locationIds[0]
      ? { OR: [{ restaurantLocationId: { in: locationIds } }, { restaurantLocationId: null }] }
      : {}),
  }

  const records = await prisma.wasteRecord.findMany({
    where,
    include: { ingredient: { select: { cost: true } } },
  })

  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0)
  const totalCostImpact = records.reduce(
    (sum, r) => sum + r.quantity * r.ingredient.cost,
    0
  )

  // Delta vs periodo anterior
  const start = new Date(dateStart)
  const end = new Date(dateEnd)
  const diffMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - diffMs)

  const prevRecords = await prisma.wasteRecord.findMany({
    where: {
      createdAt: { gte: prevStart, lte: prevEnd },
      ...(locationIds.length > 0 && locationIds[0]
        ? { OR: [{ restaurantLocationId: { in: locationIds } }, { restaurantLocationId: null }] }
        : {}),
    },
    include: { ingredient: { select: { cost: true } } },
  })

  const prevCostImpact = prevRecords.reduce(
    (sum, r) => sum + r.quantity * r.ingredient.cost,
    0
  )

  const costDelta =
    prevCostImpact > 0
      ? Math.round(
          ((totalCostImpact - prevCostImpact) / prevCostImpact) * 1000
        ) / 10
      : null

  return {
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    totalCostImpact: Math.round(totalCostImpact * 100) / 100,
    totalRecords: records.length,
    avgQuantityPerRecord:
      records.length > 0
        ? Math.round((totalQuantity / records.length) * 100) / 100
        : 0,
    costDelta,
  }
}

// ─── Tendencia ────────────────────────────────────────────────

export async function getWasteTrend(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<WasteTrendPoint[]> {
  await requirePermission("sherlock", "read")

  const records = await prisma.wasteRecord.findMany({
    where: {
      createdAt: {
        gte: new Date(dateStart),
        lte: new Date(dateEnd + "T23:59:59"),
      },
      ...(locationIds.length > 0 && locationIds[0]
        ? { OR: [{ restaurantLocationId: { in: locationIds } }, { restaurantLocationId: null }] }
        : {}),
    },
    include: { ingredient: { select: { cost: true } } },
    orderBy: { createdAt: "asc" },
  })

  const byMonth = new Map<
    string,
    { quantity: number; costImpact: number; records: number }
  >()

  for (const r of records) {
    const key = r.createdAt.toISOString().slice(0, 7)
    const existing = byMonth.get(key) ?? {
      quantity: 0,
      costImpact: 0,
      records: 0,
    }
    existing.quantity += r.quantity
    existing.costImpact += r.quantity * r.ingredient.cost
    existing.records++
    byMonth.set(key, existing)
  }

  return Array.from(byMonth.entries()).map(([period, data]) => ({
    period,
    quantity: Math.round(data.quantity * 100) / 100,
    costImpact: Math.round(data.costImpact * 100) / 100,
    records: data.records,
  }))
}

// ─── Por motivo ───────────────────────────────────────────────

export async function getWasteByReason(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<WasteByReasonPoint[]> {
  await requirePermission("sherlock", "read")

  const records = await prisma.wasteRecord.findMany({
    where: {
      createdAt: {
        gte: new Date(dateStart),
        lte: new Date(dateEnd + "T23:59:59"),
      },
      ...(locationIds.length > 0 && locationIds[0]
        ? { OR: [{ restaurantLocationId: { in: locationIds } }, { restaurantLocationId: null }] }
        : {}),
    },
    include: { ingredient: { select: { cost: true } } },
  })

  const byReason = new Map<
    string,
    { quantity: number; costImpact: number; count: number }
  >()

  for (const r of records) {
    const existing = byReason.get(r.reason) ?? {
      quantity: 0,
      costImpact: 0,
      count: 0,
    }
    existing.quantity += r.quantity
    existing.costImpact += r.quantity * r.ingredient.cost
    existing.count++
    byReason.set(r.reason, existing)
  }

  return Array.from(byReason.entries())
    .map(([reason, data]) => ({
      reason,
      quantity: Math.round(data.quantity * 100) / 100,
      costImpact: Math.round(data.costImpact * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.costImpact - a.costImpact)
}

// ─── Top ingredientes por impacto ─────────────────────────────

export async function getWasteByIngredient(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  limit = 15
): Promise<WasteByIngredientPoint[]> {
  await requirePermission("sherlock", "read")

  const records = await prisma.wasteRecord.findMany({
    where: {
      createdAt: {
        gte: new Date(dateStart),
        lte: new Date(dateEnd + "T23:59:59"),
      },
      ...(locationIds.length > 0 && locationIds[0]
        ? { OR: [{ restaurantLocationId: { in: locationIds } }, { restaurantLocationId: null }] }
        : {}),
    },
    include: {
      ingredient: {
        select: {
          name: true,
          cost: true,
          unitType: { select: { abbreviation: true } },
        },
      },
    },
  })

  const byIngredient = new Map<
    string,
    {
      name: string
      quantity: number
      costImpact: number
      unitAbbreviation: string
      count: number
    }
  >()

  for (const r of records) {
    const existing = byIngredient.get(r.ingredientId) ?? {
      name: r.ingredient.name,
      quantity: 0,
      costImpact: 0,
      unitAbbreviation: r.ingredient.unitType.abbreviation,
      count: 0,
    }
    existing.quantity += r.quantity
    existing.costImpact += r.quantity * r.ingredient.cost
    existing.count++
    byIngredient.set(r.ingredientId, existing)
  }

  return Array.from(byIngredient.values())
    .map((data) => ({
      ingredientName: data.name,
      quantity: Math.round(data.quantity * 100) / 100,
      costImpact: Math.round(data.costImpact * 100) / 100,
      unitAbbreviation: data.unitAbbreviation,
      count: data.count,
    }))
    .sort((a, b) => b.costImpact - a.costImpact)
    .slice(0, limit)
}
