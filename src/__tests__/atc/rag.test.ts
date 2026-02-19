import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockEmbeddingsCreate = vi.hoisted(() => vi.fn())
const mockChatCompletionsCreate = vi.hoisted(() => vi.fn())
const mockPineconeUpsert = vi.hoisted(() => vi.fn())
const mockPineconeDeleteMany = vi.hoisted(() => vi.fn())
const mockPineconeQuery = vi.hoisted(() => vi.fn())
const mockPineconeDescribeIndexStats = vi.hoisted(() => vi.fn())

vi.mock("openai", () => {
  const embeddingsCreate = mockEmbeddingsCreate
  const chatCreate = mockChatCompletionsCreate
  return {
    default: class MockOpenAI {
      embeddings = { create: embeddingsCreate }
      chat = { completions: { create: chatCreate } }
    },
  }
})

vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: class MockPinecone {
    index() {
      return {
        upsert: mockPineconeUpsert,
        deleteMany: mockPineconeDeleteMany,
        query: mockPineconeQuery,
        describeIndexStats: mockPineconeDescribeIndexStats,
      }
    }
  },
}))

// Importar después de los mocks
import { generateEmbedding, generateEmbeddingsBatch, buildKBText, generateHyDEQuery } from "@/lib/embeddings"
import {
  upsertKnowledgeVector,
  upsertKnowledgeVectorsBatch,
  deleteKnowledgeVectors,
  deleteVectorsBySource,
  searchSimilar,
} from "@/lib/pinecone"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i * 0.001)

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RAG Pipeline — Embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: MOCK_EMBEDDING }],
    })
  })

  it("generateEmbedding devuelve un vector de 1536 dimensiones", async () => {
    const result = await generateEmbedding("¿Tenéis terraza?")
    expect(result).toHaveLength(1536)
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: "openai/text-embedding-3-small",
      input: "¿Tenéis terraza?",
    })
  })

  it("generateEmbedding trunca textos mayores de 8000 chars", async () => {
    const longText = "a".repeat(10000)
    await generateEmbedding(longText)
    const call = mockEmbeddingsCreate.mock.calls[0][0]
    expect(call.input).toHaveLength(8000)
  })

  it("generateEmbeddingsBatch procesa múltiples textos en un solo batch", async () => {
    const texts = ["texto1", "texto2", "texto3"]
    // La función manda el batch completo en una sola llamada
    mockEmbeddingsCreate.mockResolvedValue({
      data: [
        { embedding: MOCK_EMBEDDING },
        { embedding: MOCK_EMBEDDING },
        { embedding: MOCK_EMBEDDING },
      ],
    })
    const result = await generateEmbeddingsBatch(texts)
    expect(result).toHaveLength(3)
    // 3 textos caben en un lote de 100 → 1 sola llamada a la API
    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1)
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: "openai/text-embedding-3-small",
      input: ["texto1", "texto2", "texto3"],
    })
  })

  it("generateEmbeddingsBatch procesa en lotes de 100 con delay", async () => {
    // 101 textos → 2 llamadas (lote 1: 100, lote 2: 1)
    const texts = Array.from({ length: 101 }, (_, i) => `texto-${i}`)
    // Primera llamada devuelve 100 embeddings, segunda devuelve 1
    mockEmbeddingsCreate
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, () => ({ embedding: MOCK_EMBEDDING })),
      })
      .mockResolvedValueOnce({
        data: [{ embedding: MOCK_EMBEDDING }],
      })

    const result = await generateEmbeddingsBatch(texts)
    expect(result).toHaveLength(101)
    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2)
  })

  it("buildKBText combina título, sección y contenido correctamente", () => {
    const text = buildKBText("Salón Principal", "Capacidad de 80 comensales", "Espacios interiores")
    expect(text).toContain("Salón Principal")
    expect(text).toContain("Espacios interiores")
    expect(text).toContain("Capacidad de 80 comensales")
  })

  it("buildKBText funciona sin sección", () => {
    const text = buildKBText("Horario", "Abrimos de martes a domingo")
    expect(text).toContain("Horario")
    expect(text).toContain("Abrimos de martes a domingo")
  })
})

describe("RAG Pipeline — HyDE (Hypothetical Document Embeddings)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generateHyDEQuery devuelve respuesta hipotética concatenada con la query", async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "Disponemos de una terraza exterior con 40 plazas." } }],
    })
    const result = await generateHyDEQuery("¿Tenéis terraza?")
    expect(result).toContain("Disponemos de una terraza exterior")
    expect(result).toContain("¿Tenéis terraza?")
    expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1)
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 120, temperature: 0.1 })
    )
  })

  it("generateHyDEQuery devuelve solo la query si el LLM no responde", async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    })
    const result = await generateHyDEQuery("¿Tenéis terraza?")
    expect(result).toBe("¿Tenéis terraza?")
  })

  it("generateHyDEQuery devuelve solo la query si choices está vacío", async () => {
    mockChatCompletionsCreate.mockResolvedValue({ choices: [] })
    const result = await generateHyDEQuery("¿Precio del menú?")
    expect(result).toBe("¿Precio del menú?")
  })
})

describe("RAG Pipeline — Pinecone Operaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPineconeUpsert.mockResolvedValue(undefined)
    mockPineconeDeleteMany.mockResolvedValue(undefined)
  })

  it("upsertKnowledgeVector llama a index.upsert con formato { records: [...] }", async () => {
    await upsertKnowledgeVector("entry-1", MOCK_EMBEDDING, {
      title: "Terraza",
      source: "seed",
      active: true,
    })
    expect(mockPineconeUpsert).toHaveBeenCalledWith({
      records: expect.arrayContaining([
        expect.objectContaining({ id: "entry-1", values: MOCK_EMBEDDING }),
      ]),
    })
  })

  it("upsertKnowledgeVectorsBatch procesa en lotes de 100", async () => {
    const entries = Array.from({ length: 150 }, (_, i) => ({
      id: `entry-${i}`,
      values: MOCK_EMBEDDING,
      metadata: { title: `Entrada ${i}`, source: "seed", active: true },
    }))
    await upsertKnowledgeVectorsBatch(entries)
    // 150 entradas → 2 lotes (100 + 50)
    expect(mockPineconeUpsert).toHaveBeenCalledTimes(2)
  })

  it("deleteKnowledgeVectors llama a deleteMany con { ids: [...] }", async () => {
    await deleteKnowledgeVectors(["id-1", "id-2"])
    expect(mockPineconeDeleteMany).toHaveBeenCalledWith({ ids: ["id-1", "id-2"] })
  })

  it("deleteKnowledgeVectors no llama a deleteMany si el array está vacío", async () => {
    await deleteKnowledgeVectors([])
    expect(mockPineconeDeleteMany).not.toHaveBeenCalled()
  })

  it("deleteVectorsBySource llama a deleteMany con filtro de source", async () => {
    await deleteVectorsBySource("gstock")
    expect(mockPineconeDeleteMany).toHaveBeenCalledWith({
      filter: { source: { $eq: "gstock" } },
    })
  })
})

describe("RAG Pipeline — searchSimilar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockMatches = [
    {
      id: "kb-1",
      score: 0.92,
      metadata: { title: "Terraza exterior", section: "Espacios exteriores", source: "seed", active: true },
    },
    {
      id: "kb-2",
      score: 0.85,
      metadata: { title: "Salón principal", section: "Espacios interiores", source: "seed", active: true },
    },
    {
      id: "kb-3",
      score: 0.50, // Por debajo del umbral 0.55
      metadata: { title: "Aparcamiento", section: null, source: "seed", active: true },
    },
  ]

  it("filtra resultados con score inferior al umbral (0.55)", async () => {
    mockPineconeQuery.mockResolvedValue({ matches: mockMatches })
    const results = await searchSimilar(MOCK_EMBEDDING)
    // Solo deben pasar kb-1 (0.92) y kb-2 (0.85)
    expect(results).toHaveLength(2)
    expect(results.map(r => r.id)).toEqual(["kb-1", "kb-2"])
  })

  it("preserva el orden por score descendente", async () => {
    mockPineconeQuery.mockResolvedValue({ matches: mockMatches })
    const results = await searchSimilar(MOCK_EMBEDDING)
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it("aplica filtro por categoryId cuando se proporciona", async () => {
    mockPineconeQuery.mockResolvedValue({ matches: [] })
    await searchSimilar(MOCK_EMBEDDING, 5, { categoryId: "cat-abc" })
    expect(mockPineconeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ categoryId: { $eq: "cat-abc" } }),
      })
    )
  })

  it("siempre filtra por active: true en Pinecone", async () => {
    mockPineconeQuery.mockResolvedValue({ matches: [] })
    await searchSimilar(MOCK_EMBEDDING)
    expect(mockPineconeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ active: { $eq: true } }),
      })
    )
  })

  it("devuelve array vacío cuando no hay matches", async () => {
    mockPineconeQuery.mockResolvedValue({ matches: [] })
    const results = await searchSimilar(MOCK_EMBEDDING)
    expect(results).toEqual([])
  })

  it("devuelve array vacío si Pinecone no devuelve matches", async () => {
    mockPineconeQuery.mockResolvedValue({})
    const results = await searchSimilar(MOCK_EMBEDDING)
    expect(results).toEqual([])
  })

  it("respeta topK personalizado", async () => {
    mockPineconeQuery.mockResolvedValue({ matches: [] })
    await searchSimilar(MOCK_EMBEDDING, 10)
    expect(mockPineconeQuery).toHaveBeenCalledWith(
      expect.objectContaining({ topK: 10 })
    )
  })
})

describe("RAG Pipeline — extractTextContent (helper del route)", () => {
  // Testeamos la lógica de extracción de contenido directamente
  // (replica la función interna del route sin importarla)
  type MessagePart = { type: string; text?: string }
  type IncomingMessage = { role: string; content?: string; parts?: MessagePart[] }

  function extractTextContent(msg: IncomingMessage): string {
    if (typeof msg.content === "string" && msg.content) return msg.content
    if (msg.parts) {
      return msg.parts.filter(p => p.type === "text").map(p => p.text ?? "").join("")
    }
    return ""
  }

  it("extrae content de mensajes v5 (string)", () => {
    const msg = { role: "user", content: "¿Tenéis terraza?" }
    expect(extractTextContent(msg)).toBe("¿Tenéis terraza?")
  })

  it("extrae texto de mensajes v6 (parts array)", () => {
    const msg = {
      role: "user",
      parts: [{ type: "text", text: "¿Horario de apertura?" }],
    }
    expect(extractTextContent(msg)).toBe("¿Horario de apertura?")
  })

  it("concatena múltiples text parts", () => {
    const msg = {
      role: "user",
      parts: [
        { type: "text", text: "Hola, " },
        { type: "text", text: "¿tenéis menú infantil?" },
      ],
    }
    expect(extractTextContent(msg)).toBe("Hola, ¿tenéis menú infantil?")
  })

  it("ignora parts que no son de tipo text", () => {
    const msg = {
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "text", text: "Sí, disponemos de menú infantil." },
        { type: "reasoning", text: "pensando..." },
      ],
    }
    expect(extractTextContent(msg)).toBe("Sí, disponemos de menú infantil.")
  })

  it("prioriza content sobre parts si ambos están presentes", () => {
    const msg = {
      role: "user",
      content: "mensaje v5",
      parts: [{ type: "text", text: "mensaje v6" }],
    }
    expect(extractTextContent(msg)).toBe("mensaje v5")
  })

  it("devuelve cadena vacía si no hay content ni parts", () => {
    const msg = { role: "user" }
    expect(extractTextContent(msg)).toBe("")
  })
})

describe("RAG Pipeline — buildSystemPrompt anti-alucinación", () => {
  const FALLBACK =
    "No tengo información específica sobre eso en este momento. " +
    "Te recomiendo contactar directamente con el restaurante para obtener más detalles."

  // Replica la función del route para testearla
  function buildSystemPrompt(context: string): string {
    return `Eres el asistente de información de Dreamland Restaurant.
Tu única función es responder preguntas sobre nuestros espacios, accesibilidad, menús y alérgenos
usando EXCLUSIVAMENTE la información del contexto que se te proporciona a continuación.

REGLAS ESTRICTAS:
1. Responde SOLO con información del contexto. NUNCA uses conocimiento general ni inventes datos.
2. Si no encuentras respuesta relevante en el contexto, di exactamente: "${FALLBACK}"
3. Cita la fuente de cada dato usando el formato [Fuente: Nombre].
4. Responde en español, de forma concisa y amable.
5. Si la pregunta tiene múltiples partes, responde cada una por separado.

CONTEXTO RECUPERADO:
${context || "No se ha encontrado información relevante para esta consulta."}
`
  }

  it("incluye el mensaje de fallback cuando no hay contexto", () => {
    const prompt = buildSystemPrompt("")
    expect(prompt).toContain(FALLBACK)
    expect(prompt).toContain("No se ha encontrado información relevante")
  })

  it("incluye el contexto cuando está disponible", () => {
    const ctx = "[Fuente: Terraza]\nDisponemos de 40 plazas en terraza."
    const prompt = buildSystemPrompt(ctx)
    expect(prompt).toContain("Terraza")
    expect(prompt).toContain("40 plazas")
  })

  it("contiene las reglas anti-alucinación clave", () => {
    const prompt = buildSystemPrompt("contexto de prueba")
    expect(prompt).toContain("EXCLUSIVAMENTE")
    expect(prompt).toContain("NUNCA")
  })
})
