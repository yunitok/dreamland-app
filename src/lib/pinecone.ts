import { Pinecone, type Index } from "@pinecone-database/pinecone"

export interface KBVectorMetadata {
  title: string
  section?: string
  categoryId?: string
  source: string
  active: boolean
}

let _pinecone: Pinecone | null = null
let _index: Index | null = null

function getPineconeClient(): Pinecone {
  if (!_pinecone) {
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" })
  }
  return _pinecone
}

export function getPineconeIndex(): Index {
  if (!_index) {
    _index = getPineconeClient().index(process.env.PINECONE_INDEX_NAME || "dreamland-atc")
  }
  return _index
}

export async function upsertKnowledgeVector(
  id: string,
  embedding: number[],
  metadata: KBVectorMetadata
): Promise<void> {
  const index = getPineconeIndex()
  await index.upsert({ records: [{ id, values: embedding, metadata: metadata as unknown as Record<string, string | number | boolean | string[]> }] })
}

export async function upsertKnowledgeVectorsBatch(
  entries: Array<{ id: string; values: number[]; metadata: KBVectorMetadata }>
): Promise<void> {
  const index = getPineconeIndex()
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

export async function deleteKnowledgeVectors(ids: string[]): Promise<void> {
  if (!ids.length) return
  const index = getPineconeIndex()
  await index.deleteMany({ ids })
}

export async function deleteVectorsBySource(source: string): Promise<void> {
  const index = getPineconeIndex()
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
  scoreThreshold = 0.55
): Promise<SimilarResult[]> {
  const index = getPineconeIndex()

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
