"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { knowledgeBaseSchema, KnowledgeBaseFormValues } from "@/modules/atc/domain/schemas"
import { generateEmbedding, buildKBText } from "@/lib/embeddings"
import {
  upsertKnowledgeVector,
  deleteKnowledgeVectors,
  deleteVectorsBySource,
} from "@/lib/pinecone"
import {
  BulkKBEntry,
  bulkImportKBCore,
  syncKBBySourceCore,
  computeContentHash,
} from "./knowledge-base-core"

export type { BulkKBEntry }

// ─── Lectura ────────────────────────────────────────────────────

export async function getKnowledgeBaseEntries(filters?: {
  categoryId?: string
  source?: string
  active?: boolean
}) {
  await requirePermission("atc", "read")

  const where: Record<string, unknown> = {}
  if (filters?.categoryId) where.categoryId = filters.categoryId
  if (filters?.source) where.source = filters.source
  if (filters?.active !== undefined) where.active = filters.active

  const data = await prisma.knowledgeBase.findMany({
    where,
    orderBy: [{ source: "asc" }, { title: "asc" }],
  })

  return { success: true, data }
}

// ─── Creación ────────────────────────────────────────────────────

export async function createKnowledgeBaseEntry(formData: KnowledgeBaseFormValues) {
  await requirePermission("atc", "manage")
  const data = knowledgeBaseSchema.parse(formData)

  const entry = await prisma.knowledgeBase.create({
    data: { ...data, contentHash: computeContentHash(data.title, data.content) },
  })

  try {
    const embedding = await generateEmbedding(buildKBText(entry.title, entry.content, entry.section))
    await upsertKnowledgeVector(entry.id, embedding, {
      title: entry.title,
      section: entry.section ?? undefined,
      categoryId: entry.categoryId ?? undefined,
      source: entry.source,
      active: entry.active,
    })
  } catch (e) {
    console.error("[KB] Error generating embedding for", entry.id, e)
  }

  revalidatePath("/atc/knowledge-base")
  return { success: true, data: entry }
}

// ─── Actualización ───────────────────────────────────────────────

export async function updateKnowledgeBaseEntry(id: string, formData: KnowledgeBaseFormValues) {
  await requirePermission("atc", "manage")
  const data = knowledgeBaseSchema.parse(formData)

  const entry = await prisma.knowledgeBase.update({
    where: { id },
    data: { ...data, contentHash: computeContentHash(data.title, data.content) },
  })

  try {
    const embedding = await generateEmbedding(buildKBText(entry.title, entry.content, entry.section))
    await upsertKnowledgeVector(entry.id, embedding, {
      title: entry.title,
      section: entry.section ?? undefined,
      categoryId: entry.categoryId ?? undefined,
      source: entry.source,
      active: entry.active,
    })
  } catch (e) {
    console.error("[KB] Error regenerating embedding for", entry.id, e)
  }

  revalidatePath("/atc/knowledge-base")
  return { success: true, data: entry }
}

// ─── Toggle activo ───────────────────────────────────────────────

export async function toggleKnowledgeBaseEntry(id: string, active: boolean) {
  await requirePermission("atc", "manage")

  const entry = await prisma.knowledgeBase.update({ where: { id }, data: { active } })

  try {
    const embedding = await generateEmbedding(buildKBText(entry.title, entry.content, entry.section))
    await upsertKnowledgeVector(entry.id, embedding, {
      title: entry.title,
      section: entry.section ?? undefined,
      categoryId: entry.categoryId ?? undefined,
      source: entry.source,
      active: entry.active,
    })
  } catch (e) {
    console.error("[KB] Error updating embedding active for", entry.id, e)
  }

  revalidatePath("/atc/knowledge-base")
  return { success: true }
}

// ─── Eliminación ─────────────────────────────────────────────────

export async function deleteKnowledgeBaseEntry(id: string) {
  await requirePermission("atc", "manage")

  await deleteKnowledgeVectors([id])
  await prisma.knowledgeBase.delete({ where: { id } })

  revalidatePath("/atc/knowledge-base")
  return { success: true }
}

// ─── Importación masiva (webhook n8n) ────────────────────────────

export async function bulkImportKnowledgeBaseEntries(
  entries: BulkKBEntry[],
  skipDuplicates = true
) {
  await requirePermission("atc", "manage")
  const result = await bulkImportKBCore(entries, skipDuplicates)
  revalidatePath("/atc/knowledge-base")
  return result
}

// ─── Sync por source (n8n GStock) ────────────────────────────────

export async function syncKnowledgeBaseBySource(
  source: string,
  entries: BulkKBEntry[]
) {
  await requirePermission("atc", "manage")
  const result = await syncKBBySourceCore(source, entries)
  revalidatePath("/atc/knowledge-base")
  return result
}

// ─── Publish staged entries ──────────────────────────────────────

export async function publishStagedEntries(entries: BulkKBEntry[], source = "staged") {
  await requirePermission("atc", "manage")
  return bulkImportKnowledgeBaseEntries(entries.map(e => ({ ...e, source })))
}

// ─── Borrado masivo por source ──────────────────────────────────

export async function deleteKnowledgeBaseBySource(source: string) {
  await requirePermission("atc", "manage")

  try {
    await deleteVectorsBySource(source)
  } catch (e) {
    console.error("[KB] Error deleting vectors for source", source, e)
  }

  const result = await prisma.knowledgeBase.deleteMany({ where: { source } })
  revalidatePath("/atc/knowledge-base")
  return { success: true, deleted: result.count }
}
