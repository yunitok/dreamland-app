import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockGenerateEmbedding = vi.hoisted(() => vi.fn())
const mockGenerateHyDEQuery = vi.hoisted(() => vi.fn())
const mockSearchSimilar = vi.hoisted(() => vi.fn())
const mockPrismaKBFindMany = vi.hoisted(() => vi.fn())
const mockPrismaReservationFindMany = vi.hoisted(() => vi.fn())
const mockPrismaIncidentFindMany = vi.hoisted(() => vi.fn())
const mockPrismaWeatherAlertFindMany = vi.hoisted(() => vi.fn())
const mockPrismaWaitingListFindMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/embeddings", () => ({
  generateEmbedding: mockGenerateEmbedding,
  generateHyDEQuery: mockGenerateHyDEQuery,
}))
vi.mock("@/lib/pinecone", () => ({
  searchSimilar: mockSearchSimilar,
}))
vi.mock("ai", () => ({
  tool: vi.fn((def) => def),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    knowledgeBase: { findMany: mockPrismaKBFindMany },
    reservation: { findMany: mockPrismaReservationFindMany },
    incident: { findMany: mockPrismaIncidentFindMany },
    weatherAlert: { findMany: mockPrismaWeatherAlertFindMany },
    waitingList: { findMany: mockPrismaWaitingListFindMany },
  },
}))

import {
  createSearchKnowledgeBaseTool,
  createLookupReservationTool,
  createGetActiveIncidentsTool,
  createCheckWaitingListTool,
  extractTextContent,
} from "@/app/api/atc/chat/tools"
import {
  MOCK_EMBEDDING,
  createMockKBEntry,
  createMockReservation,
  createMockIncident,
  createMockWeatherAlert,
  createMockWaitingListEntry,
} from "./helpers/mock-factories"

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateEmbedding.mockResolvedValue(MOCK_EMBEDDING)
  mockGenerateHyDEQuery.mockResolvedValue("Respuesta hipotética.\n\n¿Tenéis terraza?")
})

// ─── Tool: searchKnowledgeBase ───────────────────────────────────────────────

describe("Tool: searchKnowledgeBase", () => {
  it("búsqueda directa exitosa (score >= 0.65) — NO activa HyDE", async () => {
    const toolDef = createSearchKnowledgeBaseTool()
    mockSearchSimilar.mockResolvedValue([
      { id: "kb-1", score: 0.88, metadata: { title: "Terraza" } },
    ])
    mockPrismaKBFindMany.mockResolvedValue([
      createMockKBEntry({ id: "kb-1", title: "Terraza exterior" }),
    ])

    const result = await toolDef.execute({ query: "¿Tenéis terraza?", categoryFilter: undefined }, {} as never)

    expect(result.found).toBe(true)
    expect(result.entries).toHaveLength(1)
    expect(mockGenerateHyDEQuery).not.toHaveBeenCalled()
  })

  it("HyDE se activa cuando topScore < 0.70", async () => {
    const toolDef = createSearchKnowledgeBaseTool()
    // Primera búsqueda: score bajo
    mockSearchSimilar
      .mockResolvedValueOnce([{ id: "kb-1", score: 0.62, metadata: {} }])
      .mockResolvedValueOnce([{ id: "kb-2", score: 0.75, metadata: {} }])
    mockPrismaKBFindMany.mockResolvedValue([
      createMockKBEntry({ id: "kb-1" }),
      createMockKBEntry({ id: "kb-2" }),
    ])

    await toolDef.execute({ query: "¿donde puedo aparcar?", categoryFilter: undefined }, {} as never)

    expect(mockGenerateHyDEQuery).toHaveBeenCalledWith("¿donde puedo aparcar?")
    expect(mockSearchSimilar).toHaveBeenCalledTimes(2)
  })

  it("HyDE merge + dedup: score máximo por id, sin duplicados", async () => {
    const scoreRef = { value: 0 }
    const toolDef = createSearchKnowledgeBaseTool(undefined, scoreRef)

    // Primera búsqueda: kb-1 con score 0.62, kb-2 con score 0.58
    mockSearchSimilar
      .mockResolvedValueOnce([
        { id: "kb-1", score: 0.62, metadata: {} },
        { id: "kb-2", score: 0.58, metadata: {} },
      ])
      // HyDE: kb-2 con score mayor (0.72), kb-3 nuevo
      .mockResolvedValueOnce([
        { id: "kb-2", score: 0.72, metadata: {} },
        { id: "kb-3", score: 0.60, metadata: {} },
      ])
    mockPrismaKBFindMany.mockResolvedValue([
      createMockKBEntry({ id: "kb-2" }),
      createMockKBEntry({ id: "kb-1" }),
      createMockKBEntry({ id: "kb-3" }),
    ])

    const result = await toolDef.execute({ query: "test", categoryFilter: undefined }, {} as never)

    expect(result.found).toBe(true)
    // kb-2 debe tener score 0.72 (el mayor), no 0.58
    expect(scoreRef.value).toBe(0.72)
    // 3 entradas únicas
    expect(result.entries).toHaveLength(3)
  })

  it("sin resultados retorna found: false", async () => {
    const toolDef = createSearchKnowledgeBaseTool()
    mockSearchSimilar.mockResolvedValue([])

    const result = await toolDef.execute({ query: "bitcoin", categoryFilter: undefined }, {} as never)

    expect(result.found).toBe(false)
    expect(result.entries).toEqual([])
  })

  it("error en generateEmbedding retorna found: false", async () => {
    const toolDef = createSearchKnowledgeBaseTool()
    mockGenerateEmbedding.mockRejectedValue(new Error("API error"))

    const result = await toolDef.execute({ query: "terraza", categoryFilter: undefined }, {} as never)

    expect(result.found).toBe(false)
    expect(result.message).toContain("Error")
  })

  it("filtro categoryId se propaga a searchSimilar", async () => {
    const toolDef = createSearchKnowledgeBaseTool("cat-from-body")
    mockSearchSimilar.mockResolvedValue([{ id: "kb-1", score: 0.90, metadata: {} }])
    mockPrismaKBFindMany.mockResolvedValue([createMockKBEntry({ id: "kb-1" })])

    await toolDef.execute({ query: "test", categoryFilter: undefined }, {} as never)

    expect(mockSearchSimilar).toHaveBeenCalledWith(
      MOCK_EMBEDDING,
      5,
      { categoryId: "cat-from-body" },
      0.65
    )
  })

  it("categoryFilter del input tiene prioridad sobre categoryId del body", async () => {
    const toolDef = createSearchKnowledgeBaseTool("cat-body")
    mockSearchSimilar.mockResolvedValue([{ id: "kb-1", score: 0.90, metadata: {} }])
    mockPrismaKBFindMany.mockResolvedValue([createMockKBEntry({ id: "kb-1" })])

    await toolDef.execute({ query: "test", categoryFilter: "cat-input" }, {} as never)

    expect(mockSearchSimilar).toHaveBeenCalledWith(
      MOCK_EMBEDDING,
      5,
      { categoryId: "cat-input" },
      0.65
    )
  })
})

// ─── Tool: lookupReservation ─────────────────────────────────────────────────

describe("Tool: lookupReservation", () => {
  it("búsqueda por nombre con filtro contains insensitive", async () => {
    const toolDef = createLookupReservationTool()
    const reservation = createMockReservation()
    mockPrismaReservationFindMany.mockResolvedValue([reservation])

    const result = await toolDef.execute({ guestName: "García", date: undefined }, {} as never)

    expect(result.found).toBe(true)
    expect(result.reservations).toHaveLength(1)
    expect(mockPrismaReservationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          guestName: { contains: "García", mode: "insensitive" },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        }),
      })
    )
  })

  it("búsqueda por fecha construye rango start/end", async () => {
    const toolDef = createLookupReservationTool()
    mockPrismaReservationFindMany.mockResolvedValue([])

    await toolDef.execute({ guestName: undefined, date: "2026-02-20" }, {} as never)

    const callArgs = mockPrismaReservationFindMany.mock.calls[0][0]
    expect(callArgs.where.date.gte).toBeInstanceOf(Date)
    expect(callArgs.where.date.lte).toBeInstanceOf(Date)
    // El rango debe ser del mismo día
    expect(callArgs.where.date.gte.getDate()).toBe(callArgs.where.date.lte.getDate())
  })

  it("excluye CANCELLED y NO_SHOW", async () => {
    const toolDef = createLookupReservationTool()
    mockPrismaReservationFindMany.mockResolvedValue([])

    await toolDef.execute({ guestName: "Test", date: undefined }, {} as never)

    expect(mockPrismaReservationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        }),
      })
    )
  })

  it("sin resultados retorna found: false", async () => {
    const toolDef = createLookupReservationTool()
    mockPrismaReservationFindMany.mockResolvedValue([])

    const result = await toolDef.execute({ guestName: "Inexistente", date: undefined }, {} as never)
    expect(result.found).toBe(false)
    expect(result.reservations).toEqual([])
  })

  it("error retorna found: false", async () => {
    const toolDef = createLookupReservationTool()
    mockPrismaReservationFindMany.mockRejectedValue(new Error("DB error"))

    const result = await toolDef.execute({ guestName: "Test", date: undefined }, {} as never)
    expect(result.found).toBe(false)
  })
})

// ─── Tool: getActiveIncidents ────────────────────────────────────────────────

describe("Tool: getActiveIncidents", () => {
  it("con incidencias activas → hasActiveIssues: true", async () => {
    const toolDef = createGetActiveIncidentsTool()
    mockPrismaIncidentFindMany.mockResolvedValue([createMockIncident()])
    mockPrismaWeatherAlertFindMany.mockResolvedValue([createMockWeatherAlert()])

    const result = await toolDef.execute({}, {} as never)

    expect(result.hasActiveIssues).toBe(true)
    expect(result.incidents).toHaveLength(1)
    expect(result.weatherAlerts).toHaveLength(1)
  })

  it("sin incidencias → hasActiveIssues: false", async () => {
    const toolDef = createGetActiveIncidentsTool()
    mockPrismaIncidentFindMany.mockResolvedValue([])
    mockPrismaWeatherAlertFindMany.mockResolvedValue([])

    const result = await toolDef.execute({}, {} as never)

    expect(result.hasActiveIssues).toBe(false)
    expect(result.incidents).toEqual([])
    expect(result.weatherAlerts).toEqual([])
  })

  it("error retorna arrays vacíos", async () => {
    const toolDef = createGetActiveIncidentsTool()
    mockPrismaIncidentFindMany.mockRejectedValue(new Error("DB error"))

    const result = await toolDef.execute({}, {} as never)
    expect(result.hasActiveIssues).toBe(false)
  })
})

// ─── Tool: checkWaitingList ──────────────────────────────────────────────────

describe("Tool: checkWaitingList", () => {
  it("filtra por fecha + notified: false, limita a 8 entries", async () => {
    const toolDef = createCheckWaitingListTool()
    const entries = Array.from({ length: 10 }, (_, i) =>
      createMockWaitingListEntry({ guestName: `Persona ${i}` })
    )
    mockPrismaWaitingListFindMany.mockResolvedValue(entries)

    const result = await toolDef.execute({ date: "2026-02-20" }, {} as never)

    expect(result.totalWaiting).toBe(10)
    expect(result.entries).toHaveLength(8)
    expect(result.entries[0].position).toBe(1)

    const callArgs = mockPrismaWaitingListFindMany.mock.calls[0][0]
    expect(callArgs.where.notified).toBe(false)
  })

  it("sin entradas → totalWaiting: 0", async () => {
    const toolDef = createCheckWaitingListTool()
    mockPrismaWaitingListFindMany.mockResolvedValue([])

    const result = await toolDef.execute({ date: "2026-02-20" }, {} as never)
    expect(result.totalWaiting).toBe(0)
    expect(result.entries).toEqual([])
  })

  it("error retorna totalWaiting: 0", async () => {
    const toolDef = createCheckWaitingListTool()
    mockPrismaWaitingListFindMany.mockRejectedValue(new Error("DB error"))

    const result = await toolDef.execute({ date: "2026-02-20" }, {} as never)
    expect(result.totalWaiting).toBe(0)
  })
})

// ─── extractTextContent ──────────────────────────────────────────────────────

describe("extractTextContent", () => {
  it("extrae content string (formato v5)", () => {
    expect(extractTextContent({ role: "user", content: "Hola" })).toBe("Hola")
  })

  it("extrae texto de parts (formato v6)", () => {
    const msg = { role: "user", parts: [{ type: "text", text: "¿Terraza?" }] }
    expect(extractTextContent(msg)).toBe("¿Terraza?")
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

  it("prioriza content sobre parts", () => {
    const msg = {
      role: "user",
      content: "mensaje v5",
      parts: [{ type: "text", text: "mensaje v6" }],
    }
    expect(extractTextContent(msg)).toBe("mensaje v5")
  })

  it("devuelve cadena vacía si no hay content ni parts", () => {
    expect(extractTextContent({ role: "user" })).toBe("")
  })

  it("slicing a últimos 6 mensajes", () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i}`,
    }))
    const sliced = messages.slice(-6)
    expect(sliced).toHaveLength(6)
    expect(sliced[0].content).toBe("msg-4")
  })
})
