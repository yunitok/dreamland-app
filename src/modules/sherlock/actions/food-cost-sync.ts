"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"
import { revalidatePath } from "next/cache"

/**
 * Obtiene los locales con su mapeo de centros GStock para la UI de configuración.
 */
export async function getLocationsWithGstockMapping() {
  await requirePermission("sherlock", "read")

  return prisma.restaurantLocation.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      city: true,
      gstockCenterId: true,
      agoraPosId: true,
    },
    orderBy: { name: "asc" },
  })
}

/**
 * Actualiza el gstockCenterId de un local.
 */
export async function updateGstockCenterMapping(
  locationId: string,
  centerId: number | null
) {
  await requirePermission("sherlock", "manage")

  await prisma.restaurantLocation.update({
    where: { id: locationId },
    data: { gstockCenterId: centerId },
  })

  revalidatePath("/gastrolab/settings")
  revalidatePath("/sherlock")
  return { success: true }
}

/**
 * Obtiene el último snapshot de costes para cada local.
 */
export async function getLatestFoodCostSnapshots() {
  await requirePermission("sherlock", "read")

  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true, gstockCenterId: { not: null } },
    select: { id: true, name: true },
  })

  const snapshots = await Promise.all(
    locations.map(async (loc) => {
      const latest = await prisma.foodCostSnapshot.findFirst({
        where: { restaurantLocationId: loc.id },
        orderBy: { periodEnd: "desc" },
      })
      return { location: loc, snapshot: latest }
    })
  )

  return snapshots
}
