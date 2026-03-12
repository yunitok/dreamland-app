"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"
import { InventoryStatus } from "@prisma/client"
import { addDays } from "date-fns"

export interface LowStockAlert {
  id: string
  name: string
  currentStock: number
  minStock: number
  deficit: number
  unitAbbreviation: string
}

export interface ExpiryAlert {
  id: string
  ingredientName: string
  quantity: number
  unitAbbreviation: string
  expiryDate: Date
  daysLeft: number
  location: string | null
  lotNumber: string | null
}

export interface OutOfStockItem {
  id: string
  name: string
  unitAbbreviation: string
}

export interface StockAlertsSummary {
  lowStock: LowStockAlert[]
  expiringItems: ExpiryAlert[]
  outOfStock: OutOfStockItem[]
  totalAlerts: number
}

export async function getStockAlerts(
  expiryDaysThreshold = 7
): Promise<StockAlertsSummary> {
  await requirePermission("sherlock", "read")

  const now = new Date()
  const thresholdDate = addDays(now, expiryDaysThreshold)

  const [lowStockRaw, expiringRaw, outOfStockRaw] = await Promise.all([
    // 1. Ingredientes activos con currentStock < minStock (ambos NOT NULL)
    prisma.ingredient.findMany({
      where: {
        status: "ACTIVE",
        currentStock: { not: null },
        minStock: { not: null },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStock: true,
        unitType: { select: { abbreviation: true } },
      },
      orderBy: { name: "asc" },
    }),

    // 2. InventoryRecords con expiryDate en próximos N días, status AVAILABLE
    prisma.inventoryRecord.findMany({
      where: {
        status: InventoryStatus.AVAILABLE,
        expiryDate: {
          gte: now,
          lte: thresholdDate,
        },
      },
      select: {
        id: true,
        quantity: true,
        expiryDate: true,
        location: true,
        lotNumber: true,
        ingredient: {
          select: {
            name: true,
            unitType: { select: { abbreviation: true } },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    }),

    // 3. Ingredientes activos con currentStock <= 0
    prisma.ingredient.findMany({
      where: {
        status: "ACTIVE",
        currentStock: { lte: 0 },
      },
      select: {
        id: true,
        name: true,
        unitType: { select: { abbreviation: true } },
      },
      orderBy: { name: "asc" },
    }),
  ])

  // Filtrar low stock: solo los que realmente están por debajo del mínimo
  const lowStock: LowStockAlert[] = lowStockRaw
    .filter((i) => i.currentStock! < i.minStock!)
    .map((i) => ({
      id: i.id,
      name: i.name,
      currentStock: i.currentStock!,
      minStock: i.minStock!,
      deficit: i.minStock! - i.currentStock!,
      unitAbbreviation: i.unitType.abbreviation,
    }))

  const expiringItems: ExpiryAlert[] = expiringRaw.map((r) => ({
    id: r.id,
    ingredientName: r.ingredient.name,
    quantity: r.quantity,
    unitAbbreviation: r.ingredient.unitType.abbreviation,
    expiryDate: r.expiryDate!,
    daysLeft: Math.ceil(
      (r.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
    location: r.location,
    lotNumber: r.lotNumber,
  }))

  const outOfStock: OutOfStockItem[] = outOfStockRaw.map((i) => ({
    id: i.id,
    name: i.name,
    unitAbbreviation: i.unitType.abbreviation,
  }))

  return {
    lowStock,
    expiringItems,
    outOfStock,
    totalAlerts: lowStock.length + expiringItems.length + outOfStock.length,
  }
}
