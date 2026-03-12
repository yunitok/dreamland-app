"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"

// ─── Tipos ───────────────────────────────────────────────────

export interface SherlockLandingSummary {
  // Revenue (de AgoraSalesSnapshot — fiable)
  totalRevenue: number
  revenueMonths: number

  // Food cost teórico (de FoodCostSnapshot — parcial)
  theoreticalCostTotal: number
  theoreticalFoodCostPercent: number | null

  // Coste real (de FoodCostSnapshot — actualmente 0)
  realCostTotal: number
  hasRealCostData: boolean

  // Sync status
  locationsWithGstock: number
  totalLocations: number
  snapshotCount: number
  monthsWithTheoreticalData: number
  totalMonthsSynced: number
  lastSyncDate: Date | null

  // Mermas
  wasteRecordCount: number
  wasteCostImpact: number
}

// ─── Action ──────────────────────────────────────────────────

export async function getSherlockLandingSummary(): Promise<SherlockLandingSummary> {
  await requirePermission("sherlock", "read")

  const [
    snapshotAgg,
    snapshotCount,
    monthsWithData,
    locationsGstock,
    totalLocations,
    lastSync,
    wasteData,
  ] = await Promise.all([
    // Agregados de FoodCostSnapshot
    prisma.foodCostSnapshot.aggregate({
      _sum: {
        realCostTotal: true,
        theoreticalCostTotal: true,
        periodRevenue: true,
      },
    }),

    // Total snapshots
    prisma.foodCostSnapshot.count(),

    // Meses con coste teórico > 0 (para saber cuántos tienen datos reales de GStock)
    prisma.foodCostSnapshot.count({
      where: { theoreticalCostTotal: { gt: 0 } },
    }),

    // Locales con GStock configurado
    prisma.restaurantLocation.count({
      where: { isActive: true, gstockCenterId: { not: null } },
    }),

    // Total locales activos
    prisma.restaurantLocation.count({
      where: { isActive: true },
    }),

    // Última sincronización
    prisma.foodCostSnapshot.findFirst({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),

    // Mermas: count + impacto
    prisma.wasteRecord.findMany({
      include: { ingredient: { select: { cost: true } } },
    }),
  ])

  const realCostTotal = snapshotAgg._sum.realCostTotal ?? 0
  const theoreticalCostTotal = snapshotAgg._sum.theoreticalCostTotal ?? 0
  const totalRevenue = snapshotAgg._sum.periodRevenue ?? 0

  const theoreticalFoodCostPercent =
    totalRevenue > 0
      ? Math.round((theoreticalCostTotal / totalRevenue) * 10000) / 100
      : null

  // Calcular meses únicos sincronizados
  const distinctMonths = snapshotCount > 0 ? Math.round(snapshotCount / Math.max(locationsGstock, 1)) : 0

  const wasteCostImpact = wasteData.reduce(
    (sum, r) => sum + r.quantity * r.ingredient.cost,
    0
  )

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueMonths: distinctMonths,
    theoreticalCostTotal: Math.round(theoreticalCostTotal * 100) / 100,
    theoreticalFoodCostPercent,
    realCostTotal: Math.round(realCostTotal * 100) / 100,
    hasRealCostData: realCostTotal > 0,
    locationsWithGstock: locationsGstock,
    totalLocations: totalLocations,
    snapshotCount,
    monthsWithTheoreticalData: Math.round(monthsWithData / Math.max(locationsGstock, 1)),
    totalMonthsSynced: distinctMonths,
    lastSyncDate: lastSync?.syncedAt ?? null,
    wasteRecordCount: wasteData.length,
    wasteCostImpact: Math.round(wasteCostImpact * 100) / 100,
  }
}
