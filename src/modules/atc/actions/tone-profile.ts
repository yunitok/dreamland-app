"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"

export async function getToneProfile() {
  await requirePermission("atc", "read")

  const profile = await prisma.aiToneProfile.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  })

  return { success: true, data: profile }
}

export async function refreshToneProfile() {
  await requirePermission("atc", "manage")

  try {
    // Import dynamically to avoid bundling AI SDK in client
    const { extractToneFromEmails } = await import("@/modules/atc/domain/draft-generator")
    const result = await extractToneFromEmails()
    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al actualizar el perfil de tono"
    return { success: false, error: msg }
  }
}
