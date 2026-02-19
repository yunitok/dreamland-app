import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Tests de integración: ejecutan la lógica REAL de @/lib/embeddings
 * y @/lib/pinecone, solo mockeando los SDKs base (openai, pinecone).
 */

// ─── Mocks hoisted (solo SDKs base) ─────────────────────────────────────────

const mockEmbeddingsCreate = vi.hoisted(() => vi.fn())
const mockChatCompletionsCreate = vi.hoisted(() => vi.fn())
const mockPineconeQuery = vi.hoisted(() => vi.fn())
const mockPineconeUpsert = vi.hoisted(() => vi.fn())
const mockPineconeDeleteMany = vi.hoisted(() => vi.fn())
const mockPineconeDescribeIndexStats = vi.hoisted(() => vi.fn())

vi.mock("openai", () => ({
  default: class MockOpenAI {
    embeddings = { create: mockEmbeddingsCreate }
    chat = { completions: { create: mockChatCompletionsCreate } }
  },
}))

vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: class MockPinecone {
    index() {
      return {
        query: mockPineconeQuery,
        upsert: mockPineconeUpsert,
        deleteMany: mockPineconeDeleteMany,
        describeIndexStats: mockPineconeDescribeIndexStats,
      }
    }
  },
}))

// Importar módulos REALES (no mockeados)
import { generateEmbedding, generateEmbeddingsBatch, buildKBText, generateHyDEQuery } from "@/lib/embeddings"
import { searchSimilar, upsertKnowledgeVector, upsertKnowledgeVectorsBatch } from "@/lib/pinecone"
import { MOCK_EMBEDDING, createPineconeMatch } from "./helpers/mock-factories"

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockEmbeddingsCreate.mockResolvedValue({
    data: [{ embedding: MOCK_EMBEDDING }],
  })
})

// ─── Integration: query → embedding → search → results ──────────────────────

describe("Integration: flujo completo query → embedding → searchSimilar", () => {
  it("genera embedding real y busca en Pinecone con filtro de score", async () => {
    mockPineconeQuery.mockResolvedValue({
      matches: [
        createPineconeMatch("kb-1", 0.88, { title: "Terraza" }),
        createPineconeMatch("kb-2", 0.72, { title: "Salón" }),
        createPineconeMatch("kb-3", 0.40, { title: "Otro" }), // debajo del umbral
      ],
    })

    const embedding = await generateEmbedding("¿Tenéis terraza?")
    expect(embedding).toHaveLength(1536)

    const results = await searchSimilar(embedding, 5, undefined, 0.55)
    expect(results).toHaveLength(2) // kb-3 filtrado
    expect(results[0].id).toBe("kb-1")
    expect(results[0].score).toBe(0.88)
  })

  it("filtro con threshold 0.65 es más estricto que 0.55", async () => {
    mockPineconeQuery.mockResolvedValue({
      matches: [
        createPineconeMatch("kb-1", 0.70),
        createPineconeMatch("kb-2", 0.60), // pasa 0.55, no pasa 0.65
      ],
    })

    const embedding = await generateEmbedding("test")

    const resultsPermissive = await searchSimilar(embedding, 5, undefined, 0.55)
    expect(resultsPermissive).toHaveLength(2)

    const resultsStrict = await searchSimilar(embedding, 5, undefined, 0.65)
    expect(resultsStrict).toHaveLength(1)
  })
})

// ─── Integration: flujo HyDE completo ────────────────────────────────────────

describe("Integration: flujo HyDE completo", () => {
  it("genera respuesta hipotética y combina con la query", async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "Disponemos de una terraza exterior con 40 plazas." } }],
    })

    const hydeQuery = await generateHyDEQuery("¿Tenéis terraza?")

    expect(hydeQuery).toContain("Disponemos de una terraza exterior")
    expect(hydeQuery).toContain("¿Tenéis terraza?")
  })

  it("embedding de HyDE query puede buscar en Pinecone", async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "Tenemos parking gratuito." } }],
    })
    mockPineconeQuery.mockResolvedValue({
      matches: [createPineconeMatch("kb-parking", 0.82, { title: "Aparcamiento" })],
    })

    const hydeQuery = await generateHyDEQuery("¿Hay parking?")
    const embedding = await generateEmbedding(hydeQuery)
    const results = await searchSimilar(embedding)

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("kb-parking")
  })
})

// ─── Integration: flujo KB create → embed → upsert ──────────────────────────

describe("Integration: flujo KB create → embed → upsert", () => {
  it("buildKBText + generateEmbedding + upsertKnowledgeVector", async () => {
    const text = buildKBText("Terraza exterior", "40 plazas disponibles.", "Espacios")
    expect(text).toContain("Terraza exterior")
    expect(text).toContain("Espacios")

    const embedding = await generateEmbedding(text)
    expect(embedding).toHaveLength(1536)

    await upsertKnowledgeVector("kb-new", embedding, {
      title: "Terraza exterior",
      source: "manual",
      active: true,
    })

    expect(mockPineconeUpsert).toHaveBeenCalledWith({
      records: expect.arrayContaining([
        expect.objectContaining({ id: "kb-new", values: MOCK_EMBEDDING }),
      ]),
    })
  })
})

// ─── Integration: batch import ───────────────────────────────────────────────

describe("Integration: batch import N textos → N embeddings → upsert", () => {
  it("procesa batch de embeddings y hace upsert en lotes", async () => {
    const texts = ["Texto 1", "Texto 2", "Texto 3"]
    mockEmbeddingsCreate.mockResolvedValue({
      data: texts.map(() => ({ embedding: MOCK_EMBEDDING })),
    })

    const embeddings = await generateEmbeddingsBatch(texts)
    expect(embeddings).toHaveLength(3)

    const vectors = embeddings.map((values, i) => ({
      id: `kb-batch-${i}`,
      values,
      metadata: { title: `Entrada ${i}`, source: "n8n" as const, active: true },
    }))

    await upsertKnowledgeVectorsBatch(vectors)
    expect(mockPineconeUpsert).toHaveBeenCalledTimes(1) // 3 < 100, solo 1 lote
  })

  it("150 entradas se dividen en 2 lotes de upsert (100 + 50)", async () => {
    const texts = Array.from({ length: 150 }, (_, i) => `Texto ${i}`)
    // Simular 2 llamadas batch de embeddings (100 + 50)
    mockEmbeddingsCreate
      .mockResolvedValueOnce({ data: Array.from({ length: 100 }, () => ({ embedding: MOCK_EMBEDDING })) })
      .mockResolvedValueOnce({ data: Array.from({ length: 50 }, () => ({ embedding: MOCK_EMBEDDING })) })

    const embeddings = await generateEmbeddingsBatch(texts)
    expect(embeddings).toHaveLength(150)

    const vectors = embeddings.map((values, i) => ({
      id: `kb-batch-${i}`,
      values,
      metadata: { title: `Entrada ${i}`, source: "n8n" as const, active: true },
    }))

    await upsertKnowledgeVectorsBatch(vectors)
    expect(mockPineconeUpsert).toHaveBeenCalledTimes(2) // 100 + 50
  })
})
