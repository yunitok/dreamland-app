"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"
import { testAgoraConnection as testConnection } from "@/lib/agora"
import { syncFromAgora } from "../domain/agora-sync/sync-orchestrator"
import type { AgoraSyncOptions } from "../domain/agora-sync/types"
import { revalidatePath } from "next/cache"

export async function runAgoraSync(options: Omit<AgoraSyncOptions, "onProgress">) {
  await requirePermission("gastrolab", "manage")
  try {
    const report = await syncFromAgora(options)
    revalidatePath("/gastrolab/settings")
    revalidatePath("/gastrolab/sales")
    return { success: true as const, report }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false as const, error }
  }
}

export async function testAgoraConnectionAction() {
  await requirePermission("gastrolab", "read")
  return testConnection()
}

export async function getAgoraLastSync() {
  await requirePermission("gastrolab", "read")

  return prisma.agoraSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      syncType: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      snapshotsCreated: true,
      snapshotsUpdated: true,
      productsCreated: true,
      productsUpdated: true,
      errors: true,
      durationMs: true,
    },
  })
}

export async function getAgoraProductStats() {
  await requirePermission("gastrolab", "read")

  const [totalProducts, matchedProducts, totalSnapshots] = await Promise.all([
    prisma.agoraProduct.count({ where: { isActive: true } }),
    prisma.agoraProduct.count({ where: { isActive: true, recipeId: { not: null } } }),
    prisma.agoraSalesSnapshot.count(),
  ])

  return { totalProducts, matchedProducts, totalSnapshots }
}
