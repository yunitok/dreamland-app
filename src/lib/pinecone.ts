import { Pinecone, type Index } from "@pinecone-database/pinecone"

export interface KBVectorMetadata {
  title: string
  section?: string
  categoryId?: string
  source: string
  language?: string
  active: boolean
}

let _pinecone: Pinecone | null = null
let _baseIndex: Index | null = null

function getPineconeClient(): Pinecone {
  if (!_pinecone) {
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" })
  }
  return _pinecone
}

export function getPineconeIndex(namespace?: string): Index {
  if (!_baseIndex) {
    _baseIndex = getPineconeClient().index(process.env.PINECONE_INDEX_NAME || "dreamland-atc")
  }
  return namespace ? _baseIndex.namespace(namespace) : _baseIndex
}

export async function upsertKnowledgeVector(
  id: string,
  embedding: number[],
  metadata: KBVectorMetadata,
  namespace?: string
): Promise<void> {
  const index = getPineconeIndex(namespace)
  await index.upsert({ records: [{ id, values: embedding, metadata: metadata as unknown as Record<string, string | number | boolean | string[]> }] })
}

export async function upsertKnowledgeVectorsBatch(
  entries: Array<{ id: string; values: number[]; metadata: KBVectorMetadata }>,
  namespace?: string
): Promise<void> {
  const index = getPineconeIndex(namespace)
  const BATCH = 100
  for (let i = 0; i < entries.length; i += BATCH) {
    await index.upsert({
      records: entries.slice(i, i + BATCH).map(e => ({
        id: e.id,
        values: e.values,
        metadata: e.metadata as unknown as Record<string, string | number | boolean | string[]>,
      })),
    })
  }
}

// ─── Multi-namespace helpers ────────────────────────────────────

export async function upsertKnowledgeVectorMultiNS(
  id: string,
  embedding: number[],
  metadata: KBVectorMetadata,
  namespaces: string[]
): Promise<void> {
  const results = await Promise.allSettled(
    namespaces.map(ns => upsertKnowledgeVector(id, embedding, metadata, ns))
  )
  const failed = results.filter(r => r.status === "rejected")
  if (failed.length) {
    console.error(`[Pinecone] upsert failed ${failed.length}/${namespaces.length} NS`, failed)
  }
  if (failed.length === namespaces.length) {
    throw new Error("All namespace upserts failed")
  }
}

export async function upsertKnowledgeVectorsBatchMultiNS(
  entries: Array<{ id: string; values: number[]; metadata: KBVectorMetadata }>,
  namespaces: string[]
): Promise<void> {
  const results = await Promise.allSettled(
    namespaces.map(ns => upsertKnowledgeVectorsBatch(entries, ns))
  )
  const failed = results.filter(r => r.status === "rejected")
  if (failed.length) {
    console.error(`[Pinecone] batch upsert failed ${failed.length}/${namespaces.length} NS`, failed)
  }
  if (failed.length === namespaces.length) {
    throw new Error("All namespace batch upserts failed")
  }
}

export async function deleteKnowledgeVectorsMultiNS(
  ids: string[],
  namespaces: string[]
): Promise<void> {
  if (!ids.length) return
  const results = await Promise.allSettled(
    namespaces.map(ns => deleteKnowledgeVectors(ids, ns))
  )
  const failed = results.filter(r => r.status === "rejected")
  if (failed.length) {
    console.error(`[Pinecone] delete failed ${failed.length}/${namespaces.length} NS`, failed)
  }
}

export async function deleteVectorsBySourceMultiNS(
  source: string,
  namespaces: string[]
): Promise<void> {
  const results = await Promise.allSettled(
    namespaces.map(ns => deleteVectorsBySource(source, ns))
  )
  const failed = results.filter(r => r.status === "rejected")
  if (failed.length) {
    console.error(`[Pinecone] deleteBySource failed ${failed.length}/${namespaces.length} NS`, failed)
  }
}

// ─── Single-namespace helpers ───────────────────────────────────

export async function deleteKnowledgeVectors(ids: string[], namespace?: string): Promise<void> {
  if (!ids.length) return
  const index = getPineconeIndex(namespace)
  await index.deleteMany({ ids })
}

export async function deleteVectorsBySource(source: string, namespace?: string): Promise<void> {
  const index = getPineconeIndex(namespace)
  await index.deleteMany({ filter: { source: { $eq: source } } })
}

export interface SimilarResult {
  id: string
  score: number
  metadata: KBVectorMetadata
}

export async function searchSimilar(
  queryEmbedding: number[],
  topK = 5,
  filter?: Partial<KBVectorMetadata>,
  scoreThreshold = 0.55,
  namespace?: string
): Promise<SimilarResult[]> {
  const index = getPineconeIndex(namespace)

  const queryFilter: Record<string, unknown> = { active: { $eq: true } }
  if (filter?.categoryId) queryFilter.categoryId = { $eq: filter.categoryId }
  if (filter?.source) queryFilter.source = { $eq: filter.source }

  const result = await index.query({
    vector: queryEmbedding,
    topK,
    filter: queryFilter,
    includeMetadata: true,
  })

  return (result.matches || [])
    .filter(m => (m.score ?? 0) >= scoreThreshold)
    .map(m => ({
      id: m.id,
      score: m.score ?? 0,
      metadata: m.metadata as unknown as KBVectorMetadata,
    }))
}
