"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission, hasPermission } from "@/lib/actions/rbac"
import { knowledgeBaseSchema, type KnowledgeBaseFormValues } from "@/modules/rag/domain/schemas"
import { getKBDomain, getAllKBDomains, resolveNamespaces } from "@/modules/rag/domain/domains"
import { generateEmbedding, buildKBText } from "@/lib/embeddings"
import {
  upsertKnowledgeVector,
  upsertKnowledgeVectorMultiNS,
  deleteKnowledgeVectorsMultiNS,
  deleteVectorsBySourceMultiNS,
} from "@/lib/pinecone"
import {
  bulkImportKBCore,
  syncKBBySourceCore,
  computeContentHash,
} from "./knowledge-base-core"
import type { BulkKBEntry } from "@/modules/rag/domain/types"

// ─── RBAC helper ────────────────────────────────────────────────

async function requireKBPermission(domainId: string, action: "read" | "manage") {
  const domain = getKBDomain(domainId)

  // Admin global de KB tiene acceso a todo
  const globalAccess = await hasPermission("knowledge-base", action)
  if (globalAccess) return

  // Acceso por módulo
  await requirePermission(domain.rbacResource as Parameters<typeof requirePermission>[0], action)
}

function revalidateDomain(domainId: string) {
  const domain = getKBDomain(domainId)
  if (domain.revalidatePath) {
    revalidatePath(domain.revalidatePath)
  }
}

// ─── Lectura ────────────────────────────────────────────────────

export async function getKBEntries(domainId: string, filters?: {
  categoryId?: string
  source?: string
  active?: boolean
}) {
  await requireKBPermission(domainId, "read")

  const where: Record<string, unknown> = { domains: { has: domainId } }
  if (filters?.categoryId) where.categoryId = filters.categoryId
  if (filters?.source) where.source = filters.source
  if (filters?.active !== undefined) where.active = filters.active

  const data = await prisma.knowledgeBase.findMany({
    where,
    orderBy: [{ source: "asc" }, { title: "asc" }],
  })

  return { success: true as const, data }
}

// ─── Lectura global (admin) ──────────────────────────────────────

export async function getAllKBEntries(filters?: {
  domain?: string
  source?: string
  active?: boolean
}) {
  await requirePermission("knowledge-base", "read")

  const where: Record<string, unknown> = {}
  if (filters?.domain) where.domains = { has: filters.domain }
  if (filters?.source) where.source = filters.source
  if (filters?.active !== undefined) where.active = filters.active

  const data = await prisma.knowledgeBase.findMany({
    where,
    orderBy: [{ source: "asc" }, { title: "asc" }],
  })

  return { success: true as const, data }
}

// ─── Creación ────────────────────────────────────────────────────

export async function createKBEntry(domainId: string, formData: KnowledgeBaseFormValues) {
  await requireKBPermission(domainId, "manage")
  const domainConfig = getKBDomain(domainId)
  const data = knowledgeBaseSchema.parse(formData)

  const entry = await prisma.knowledgeBase.create({
    data: { ...data, domains: [domainId], contentHash: computeContentHash(data.title, data.content) },
  })

  try {
    const embedding = await generateEmbedding(buildKBText(entry.title, entry.content, entry.section))
    await upsertKnowledgeVector(entry.id, embedding, {
      title: entry.title,
      section: entry.section ?? undefined,
      categoryId: entry.categoryId ?? undefined,
      source: entry.source,
      active: entry.active,
    }, domainConfig.namespace)
  } catch (e) {
    console.error("[KB] Error generating embedding for", entry.id, e)
  }

  revalidateDomain(domainId)
  return { success: true as const, data: entry }
}

// ─── Actualización ───────────────────────────────────────────────

export async function updateKBEntry(domainId: string, id: string, formData: KnowledgeBaseFormValues) {
  await requireKBPermission(domainId, "manage")
  const data = knowledgeBaseSchema.parse(formData)

  const entry = await prisma.knowledgeBase.update({
    where: { id },
    data: { ...data, contentHash: computeContentHash(data.title, data.content) },
  })

  try {
    const namespaces = resolveNamespaces(entry.domains)
    const embedding = await generateEmbedding(buildKBText(entry.title, entry.content, entry.section))
    await upsertKnowledgeVectorMultiNS(entry.id, embedding, {
      title: entry.title,
      section: entry.section ?? undefined,
      categoryId: entry.categoryId ?? undefined,
      source: entry.source,
      active: entry.active,
    }, namespaces)
  } catch (e) {
    console.error("[KB] Error regenerating embedding for", entry.id, e)
  }

  revalidateDomain(domainId)
  return { success: true as const, data: entry }
}

// ─── Toggle activo ───────────────────────────────────────────────

export async function toggleKBEntry(domainId: string, id: string, active: boolean) {
  await requireKBPermission(domainId, "manage")

  const entry = await prisma.knowledgeBase.update({ where: { id }, data: { active } })

  try {
    const namespaces = resolveNamespaces(entry.domains)
    const embedding = await generateEmbedding(buildKBText(entry.title, entry.content, entry.section))
    await upsertKnowledgeVectorMultiNS(entry.id, embedding, {
      title: entry.title,
      section: entry.section ?? undefined,
      categoryId: entry.categoryId ?? undefined,
      source: entry.source,
      active: entry.active,
    }, namespaces)
  } catch (e) {
    console.error("[KB] Error updating embedding active for", entry.id, e)
  }

  revalidateDomain(domainId)
  return { success: true as const }
}

// ─── Eliminación ─────────────────────────────────────────────────

export async function deleteKBEntry(domainId: string, id: string) {
  await requireKBPermission(domainId, "manage")

  const entry = await prisma.knowledgeBase.findUniqueOrThrow({ where: { id }, select: { domains: true } })
  const namespaces = resolveNamespaces(entry.domains)

  await deleteKnowledgeVectorsMultiNS([id], namespaces)
  await prisma.knowledgeBase.delete({ where: { id } })

  revalidateDomain(domainId)
  return { success: true as const }
}

// ─── Importación masiva ─────────────────────────────────────────

export async function bulkImportKBEntries(
  domainId: string,
  entries: BulkKBEntry[],
  skipDuplicates = true
) {
  await requireKBPermission(domainId, "manage")
  const result = await bulkImportKBCore(entries, skipDuplicates, [domainId])
  revalidateDomain(domainId)
  return result
}

// ─── Sync por source ────────────────────────────────────────────

export async function syncKBBySource(
  domainId: string,
  source: string,
  entries: BulkKBEntry[]
) {
  await requireKBPermission(domainId, "manage")
  const result = await syncKBBySourceCore(source, entries, [domainId])
  revalidateDomain(domainId)
  return result
}

// ─── Publish staged entries ──────────────────────────────────────

export async function publishStagedKBEntries(domainId: string, entries: BulkKBEntry[], source = "staged") {
  await requireKBPermission(domainId, "manage")
  const result = await bulkImportKBCore(entries.map(e => ({ ...e, source })), true, [domainId])
  revalidateDomain(domainId)
  return result
}

// ─── Borrado masivo por source ──────────────────────────────────

export async function deleteKBBySource(domainId: string, source: string) {
  await requireKBPermission(domainId, "manage")
  const domainConfig = getKBDomain(domainId)

  try {
    await deleteVectorsBySourceMultiNS(source, [domainConfig.namespace])
  } catch (e) {
    console.error("[KB] Error deleting vectors for source", source, e)
  }

  const result = await prisma.knowledgeBase.deleteMany({ where: { source, domains: { has: domainId } } })
  revalidateDomain(domainId)
  return { success: true as const, deleted: result.count }
}

// ─── Estadísticas por dominio ────────────────────────────────────

export async function getKBStats(domainId?: string) {
  const where = domainId ? { domains: { has: domainId } } : {}

  const [total, active, bySource] = await Promise.all([
    prisma.knowledgeBase.count({ where }),
    prisma.knowledgeBase.count({ where: { ...where, active: true } }),
    prisma.knowledgeBase.groupBy({ by: ["source"], where, _count: true }),
  ])

  // Contar entries por cada dominio registrado
  const allDomains = getAllKBDomains()
  const byDomain = await Promise.all(
    allDomains.map(async d => ({
      domain: d.id,
      count: await prisma.knowledgeBase.count({ where: { ...where, domains: { has: d.id } } }),
    }))
  )

  return {
    success: true as const,
    data: {
      total,
      active,
      inactive: total - active,
      bySource: bySource.map(s => ({ source: s.source, count: s._count })),
      byDomain: byDomain.filter(d => d.count > 0),
    },
  }
}
