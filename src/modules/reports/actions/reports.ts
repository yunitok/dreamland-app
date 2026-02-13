"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/actions/rbac"

export async function deleteReport(reportId: string) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.report.delete({
      where: {
        id: reportId,
        // Optional: Ensure user owns the report if that's a requirement
        // authorId: auth.userId 
      }
    })

    revalidatePath("/reports")
    return { success: true }
  } catch (error) {
    console.error("Error deleting report:", error)
    return { success: false, error: "Failed to delete report" }
  }
}
