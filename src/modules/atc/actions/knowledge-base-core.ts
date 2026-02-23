// Sin "use server" — intencionado: este archivo es llamado por el sync orchestrator
// y scripts CLI que no tienen contexto de Server Action de Next.js.
// Los wrappers con RBAC están en knowledge-base.ts.
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { generateEmbeddingsBatch, buildKBText } from "@/lib/embeddings"
import { upsertKnowledgeVectorsBatch, deleteVectorsBySource, KBVectorMetadata } from "@/lib/pinecone"
import type { KnowledgeBase } from "@prisma/client"

// ─── Tipos exportados ─────────────────────────────────────────────

export interface BulkKBEntry {
  title: string
  content: string
  section?: string
  categoryId?: string
  source?: string
  language?: string
}

// ─── Utilidades ──────────────────────────────────────────────────

export function computeContentHash(title: string, content: string): string {
  const normalized = `${title.trim().toLowerCase()}||${content.trim().toLowerCase()}`
  return createHash("sha256").update(normalized).digest("hex")
}

// ─── Importación masiva sin RBAC — para scripts CLI y orquestadores ──

export async function bulkImportKBCore(
  entries: BulkKBEntry[],
  skipDuplicates = true
): Promise<{ success: true; created: number; skipped: number }> {
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
  const vectors: Array<{ id: string; values: number[]; metadata: KBVectorMetadata }> = []

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
  return { success: true, created: created.length, skipped }
}

// ─── Sync por source sin RBAC — borra existentes y re-crea ──────

export async function syncKBBySourceCore(
  source: string,
  entries: BulkKBEntry[]
): Promise<{ success: true; created: number; skipped?: number }> {
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
  return bulkImportKBCore(entries.map(e => ({ ...e, source })))
}
