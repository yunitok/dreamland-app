import { describe, it, expect } from "vitest"
import { TEST_QUERIES, SCORE_THRESHOLD } from "./helpers/test-queries"

/**
 * Tests E2E del pipeline RAG contra APIs reales (OpenRouter + Pinecone).
 *
 * Se saltan automáticamente si no hay API keys configuradas.
 * Ejecutar con: npm run test:e2e:rag
 *
 * Requisitos:
 * - OPENROUTER_API_KEY en .env
 * - PINECONE_API_KEY en .env
 * - PINECONE_INDEX_NAME en .env (default: dreamland-atc)
 * - Datos de seed cargados (npx tsx prisma/seed-knowledge-base.ts)
 */

const HAS_API_KEYS =
  !!process.env.OPENROUTER_API_KEY &&
  !!process.env.PINECONE_API_KEY

const describeE2E = HAS_API_KEYS ? describe : describe.skip

describeE2E("RAG Pipeline — E2E con APIs reales", () => {
  // Los imports se hacen dentro del describe para evitar errores
  // cuando las API keys no están disponibles y los módulos inicializan conexiones

  it.each(TEST_QUERIES.filter(q => q.expectResults))(
    "devuelve resultados relevantes para: $query",
    async ({ query }) => {
      const { generateEmbedding } = await import("@/lib/embeddings")
      const { searchSimilar } = await import("@/lib/pinecone")

      const embedding = await generateEmbedding(query)
      expect(embedding).toHaveLength(1536)

      const results = await searchSimilar(embedding)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThanOrEqual(SCORE_THRESHOLD)
    },
    30_000
  )

  it("guardrail: consulta irrelevante no devuelve resultados", async () => {
    const { generateEmbedding } = await import("@/lib/embeddings")
    const { searchSimilar } = await import("@/lib/pinecone")

    const irrelevant = TEST_QUERIES.find(q => !q.expectResults)!
    const embedding = await generateEmbedding(irrelevant.query)
    const results = await searchSimilar(embedding)

    expect(results).toHaveLength(0)
  }, 30_000)

  it("HyDE mejora score para queries coloquiales", async () => {
    const { generateEmbedding, generateHyDEQuery } = await import("@/lib/embeddings")
    const { searchSimilar } = await import("@/lib/pinecone")

    const query = "donde puedo aparcar si voy al restaurante?"

    // Búsqueda directa
    const directEmb = await generateEmbedding(query)
    const directResults = await searchSimilar(directEmb, 3, undefined, 0.40)
    const directTopScore = directResults[0]?.score ?? 0

    // Búsqueda HyDE
    const hydeQuery = await generateHyDEQuery(query)
    const hydeEmb = await generateEmbedding(hydeQuery)
    const hydeResults = await searchSimilar(hydeEmb, 3, undefined, 0.40)
    const hydeTopScore = hydeResults[0]?.score ?? 0

    // HyDE debería mejorar o al menos igualar el score (margen de 0.05)
    expect(hydeTopScore).toBeGreaterThanOrEqual(directTopScore - 0.05)
  }, 45_000)

  it("índice Pinecone tiene datos del seed", async () => {
    const { Pinecone } = await import("@pinecone-database/pinecone")
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "dreamland-atc")

    const stats = await index.describeIndexStats()
    const totalVectors = stats.totalRecordCount ?? 0

    expect(totalVectors).toBeGreaterThan(0)
  }, 15_000)
})
