"use server"

import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { knowledgeBaseSchema, KnowledgeBaseFormValues } from "@/modules/atc/domain/schemas"
import { generateEmbedding, generateEmbeddingsBatch, buildKBText } from "@/lib/embeddings"
import {
  upsertKnowledgeVector,
  upsertKnowledgeVectorsBatch,
  deleteKnowledgeVectors,
  deleteVectorsBySource,
} from "@/lib/pinecone"
import type { KnowledgeBase } from "@prisma/client"

// ─── Utilidades ─────────────────────────────────────────────────

function computeContentHash(title: string, content: string): string {
  const normalized = `${title.trim().toLowerCase()}||${content.trim().toLowerCase()}`
  return createHash("sha256").update(normalized).digest("hex")
}

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

export interface BulkKBEntry {
  title: string
  content: string
  section?: string
  categoryId?: string
  source?: string
  language?: string
}

export async function bulkImportKnowledgeBaseEntries(
  entries: BulkKBEntry[],
  skipDuplicates = true
) {
  await requirePermission("atc", "manage")

  // Computar hashes para dedup
  const hashes = entries.map(e => computeContentHash(e.title, e.content))

  // Filtrar duplicados existentes en DB
  let indicesToProcess = entries.map((_, i) => i)
  if (skipDuplicates) {
    const uniqueHashes = [...new Set(hashes)]
    const existing = await prisma.knowledgeBase.findMany({
      where: { contentHash: { in: uniqueHashes } },
      select: { contentHash: true, source: true, language: true },
    })
    const existingSet = new Set(
      existing.map(e => `${e.contentHash}|${e.source}|${e.language}`)
    )
    indicesToProcess = indicesToProcess.filter(i => {
      const key = `${hashes[i]}|${entries[i].source ?? "n8n"}|${entries[i].language ?? "es"}`
      return !existingSet.has(key)
    })
  }
  const skipped = entries.length - indicesToProcess.length

  if (!indicesToProcess.length) {
    return { success: true, created: 0, skipped }
  }

  // Generar embeddings solo para entries nuevas
  const textsToEmbed = indicesToProcess.map(i =>
    buildKBText(entries[i].title, entries[i].content, entries[i].section)
  )
  const embeddings = await generateEmbeddingsBatch(textsToEmbed)

  const created: KnowledgeBase[] = []
  const vectors: Array<{ id: string; values: number[]; metadata: Parameters<typeof upsertKnowledgeVector>[2] }> = []

  for (let j = 0; j < indicesToProcess.length; j++) {
    const i = indicesToProcess[j]
    const e = entries[i]
    const entry = await prisma.knowledgeBase.create({
      data: {
        title: e.title,
        content: e.content,
        contentHash: hashes[i],
        section: e.section,
        categoryId: e.categoryId,
        source: e.source ?? "n8n",
        language: e.language ?? "es",
        active: true,
      },
    })
    created.push(entry)
    vectors.push({
      id: entry.id,
      values: embeddings[j],
      metadata: {
        title: entry.title,
        section: entry.section ?? undefined,
        categoryId: entry.categoryId ?? undefined,
        source: entry.source,
        language: entry.language,
        active: true,
      },
    })
  }

  await upsertKnowledgeVectorsBatch(vectors)
  revalidatePath("/atc/knowledge-base")
  return { success: true, created: created.length, skipped }
}

// ─── Sync por source (n8n GStock) ────────────────────────────────

export async function syncKnowledgeBaseBySource(
  source: string,
  entries: BulkKBEntry[]
) {
  await requirePermission("atc", "manage")

  // Borrar vectores existentes de esta source en Pinecone
  try {
    await deleteVectorsBySource(source)
  } catch (e) {
    console.error("[KB] Error deleting vectors for source", source, e)
  }

  // Borrar registros existentes de esta source en DB
  await prisma.knowledgeBase.deleteMany({ where: { source } })

  // Re-crear con nuevos datos
  if (!entries.length) return { success: true, created: 0 }
  return bulkImportKnowledgeBaseEntries(entries.map(e => ({ ...e, source })))
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
