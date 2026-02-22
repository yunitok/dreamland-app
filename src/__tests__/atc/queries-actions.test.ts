import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath    = vi.hoisted(() => vi.fn())
const mockGetSession        = vi.hoisted(() => vi.fn())

const mockPrismaQuery = vi.hoisted(() => ({
  findMany:  vi.fn(),
  findFirst: vi.fn(),
  create:    vi.fn(),
  update:    vi.fn(),
}))

const mockPrismaQueryResolution = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}))

const mockPrismaQueryCategory = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

const mockPrismaKB = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache",          () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/lib/auth",          () => ({ getSession: mockGetSession }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    query:           mockPrismaQuery,
    queryResolution: mockPrismaQueryResolution,
    queryCategory:   mockPrismaQueryCategory,
    knowledgeBase:   mockPrismaKB,
  },
}))

import {
  getQueries,
  getQueryCategories,
  searchKnowledgeBase,
  createQuery,
  resolveQueryManually,
  escalateQuery,
  submitChatFeedback,
} from "@/modules/atc/actions/queries"
import type { QueryFormValues } from "@/modules/atc/domain/schemas"
import { createMockSession, createMockKBEntry } from "./helpers/mock-factories"

// ─── Datos de prueba ─────────────────────────────────────────────

const validCuid = "clh1234567890abcdefghijk"

const validQueryData: QueryFormValues = {
  guestInput: "Cual es el horario de apertura",
  categoryId: validCuid,
  channel:    "WEB",
}

const mockQuery = {
  id:              "query-test-1",
  guestInput:      validQueryData.guestInput,
  categoryId:      validCuid,
  channel:         "WEB",
  status:          "PENDING",
  resolvedBy:      null,
  confidenceScore: null,
  createdAt:       new Date("2026-02-21"),
  updatedAt:       new Date("2026-02-21"),
}

// ─── Setup ──────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
  mockGetSession.mockResolvedValue(createMockSession())
  // Por defecto generateAIResponse no encuentra resultados (KB vacia)
  mockPrismaKB.findMany.mockResolvedValue([])
})
// ─── getQueries ────────────────────────────────────────────────────────────────

describe("getQueries", () => {
  it("requiere permiso read:atc", async () => {
    mockPrismaQuery.findMany.mockResolvedValue([])
    await getQueries()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("sin filtro: findMany con where undefined + include correcto + orderBy createdAt desc", async () => {
    mockPrismaQuery.findMany.mockResolvedValue([mockQuery])

    const result = await getQueries()

    expect(result).toEqual({ success: true, data: [mockQuery] })
    expect(mockPrismaQuery.findMany).toHaveBeenCalledWith({
      where:   undefined,
      include: {
        category:    true,
        resolutions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    })
  })

  it("con filtro status: where contiene el status indicado", async () => {
    mockPrismaQuery.findMany.mockResolvedValue([])

    await getQueries("PENDING" as any)

    expect(mockPrismaQuery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
      })
    )
  })
})

// ─── getQueryCategories ─────────────────────────────────────────────────────────

describe("getQueryCategories", () => {
  it("requiere permiso read:atc", async () => {
    mockPrismaQueryCategory.findMany.mockResolvedValue([])
    await getQueryCategories()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("findMany con orderBy {name: asc}", async () => {
    const cats = [{ id: "cat-1", name: "Reservas" }]
    mockPrismaQueryCategory.findMany.mockResolvedValue(cats)

    const result = await getQueryCategories()

    expect(result).toEqual({ success: true, data: cats })
    expect(mockPrismaQueryCategory.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    })
  })
})

// ─── searchKnowledgeBase ────────────────────────────────────────────────────────────

describe("searchKnowledgeBase", () => {
  it("requiere permiso read:atc", async () => {
    mockPrismaKB.findMany.mockResolvedValue([])
    await searchKnowledgeBase("horario")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("sin categoryId: where tiene active:true + OR titulo/contenido, sin filtro categoryId, take:5", async () => {
    mockPrismaKB.findMany.mockResolvedValue([])

    await searchKnowledgeBase("horario")

    expect(mockPrismaKB.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        OR: [
          { title:   { contains: "horario", mode: "insensitive" } },
          { content: { contains: "horario", mode: "insensitive" } },
        ],
      },
      take: 5,
    })
  })

  it("con categoryId: where incluye el filtro categoryId", async () => {
    mockPrismaKB.findMany.mockResolvedValue([])

    await searchKnowledgeBase("horario", validCuid)

    expect(mockPrismaKB.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        active:     true,
        categoryId: validCuid,
      }),
      take: 5,
    })
  })
})

// ─── createQuery ───────────────────────────────────────────────────────────────

describe("createQuery", () => {
  it("requiere permiso manage:atc", async () => {
    mockPrismaQuery.create.mockResolvedValue(mockQuery)
    await createQuery(validQueryData)
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("datos invalidos Zod (guestInput demasiado corto): retorna {success:false}", async () => {
    const invalidData = { ...validQueryData, guestInput: "hola" }

    const result = await createQuery(invalidData as QueryFormValues)

    expect(result).toMatchObject({ success: false })
    expect(mockPrismaQuery.create).not.toHaveBeenCalled()
  })

  it("sin respuesta AI (KB vacia): solo crea query, NO crea queryResolution, NO actualiza query", async () => {
    mockPrismaKB.findMany.mockResolvedValue([])
    mockPrismaQuery.create.mockResolvedValue(mockQuery)

    const result = await createQuery(validQueryData)

    expect(result).toMatchObject({ success: true })
    expect(mockPrismaQuery.create).toHaveBeenCalledTimes(1)
    expect(mockPrismaQueryResolution.create).not.toHaveBeenCalled()
    expect(mockPrismaQuery.update).not.toHaveBeenCalled()
  })

  it("con respuesta AI (KB con entradas): crea query + queryResolution + actualiza query a RESOLVED", async () => {
    const kbEntry = createMockKBEntry({ categoryId: validCuid })
    mockPrismaKB.findMany.mockResolvedValue([kbEntry])
    mockPrismaQuery.create.mockResolvedValue(mockQuery)
    mockPrismaQueryResolution.create.mockResolvedValue({ id: "res-test-1" })
    mockPrismaQuery.update.mockResolvedValue({ ...mockQuery, status: "RESOLVED" })

    const result = await createQuery(validQueryData)

    expect(result).toMatchObject({ success: true })
    expect(mockPrismaQuery.create).toHaveBeenCalledTimes(1)
    expect(mockPrismaQueryResolution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queryId: mockQuery.id,
          source:  "AI",
        }),
      })
    )
    expect(mockPrismaQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockQuery.id },
        data:  expect.objectContaining({
          status:     "RESOLVED",
          resolvedBy: "AI",
        }),
      })
    )
  })

  it("revalidatePath llamado siempre", async () => {
    mockPrismaQuery.create.mockResolvedValue(mockQuery)

    await createQuery(validQueryData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/queries")
  })
})

// ─── resolveQueryManually ────────────────────────────────────────────────────────

describe("resolveQueryManually", () => {
  it("requiere permiso manage:atc", async () => {
    mockPrismaQueryResolution.create.mockResolvedValue({})
    mockPrismaQuery.update.mockResolvedValue({})
    await resolveQueryManually("query-test-1", "La respuesta es X")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("crea queryResolution con source HUMAN", async () => {
    mockPrismaQueryResolution.create.mockResolvedValue({})
    mockPrismaQuery.update.mockResolvedValue({})

    await resolveQueryManually("query-test-1", "La respuesta es X")

    expect(mockPrismaQueryResolution.create).toHaveBeenCalledWith({
      data: {
        queryId:      "query-test-1",
        responseText: "La respuesta es X",
        source:       "HUMAN",
      },
    })
  })

  it("actualiza query a status RESOLVED y resolvedBy HUMAN", async () => {
    mockPrismaQueryResolution.create.mockResolvedValue({})
    mockPrismaQuery.update.mockResolvedValue({})

    await resolveQueryManually("query-test-1", "La respuesta es X")

    expect(mockPrismaQuery.update).toHaveBeenCalledWith({
      where: { id: "query-test-1" },
      data:  { status: "RESOLVED", resolvedBy: "HUMAN" },
    })
  })

  it("llama revalidatePath", async () => {
    mockPrismaQueryResolution.create.mockResolvedValue({})
    mockPrismaQuery.update.mockResolvedValue({})

    await resolveQueryManually("query-test-1", "La respuesta es X")

    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/queries")
  })

  it("retorna {success:true}", async () => {
    mockPrismaQueryResolution.create.mockResolvedValue({})
    mockPrismaQuery.update.mockResolvedValue({})

    const result = await resolveQueryManually("query-test-1", "La respuesta es X")

    expect(result).toEqual({ success: true })
  })
})

// ─── escalateQuery ───────────────────────────────────────────────────────────────────

describe("escalateQuery", () => {
  it("requiere permiso manage:atc", async () => {
    mockPrismaQuery.update.mockResolvedValue({})
    await escalateQuery("query-test-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("actualiza query con status ESCALATED", async () => {
    mockPrismaQuery.update.mockResolvedValue({})

    await escalateQuery("query-test-1")

    expect(mockPrismaQuery.update).toHaveBeenCalledWith({
      where: { id: "query-test-1" },
      data:  { status: "ESCALATED" },
    })
  })

  it("llama revalidatePath", async () => {
    mockPrismaQuery.update.mockResolvedValue({})

    await escalateQuery("query-test-1")

    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/queries")
  })

  it("retorna {success:true}", async () => {
    mockPrismaQuery.update.mockResolvedValue({})

    const result = await escalateQuery("query-test-1")

    expect(result).toEqual({ success: true })
  })
})

// ─── submitChatFeedback ─────────────────────────────────────────────────────────────

describe("submitChatFeedback", () => {
  const mockQueryWithResolution = {
    ...mockQuery,
    resolutions: [{ id: "resolution-test-1", feedback: null }],
  }

  it("sin sesion (getSession retorna null): retorna {success:false, error:No autenticado}", async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await submitChatFeedback("horario de apertura", 1)

    expect(result).toEqual({ success: false, error: "No autenticado" })
    expect(mockPrismaQuery.findFirst).not.toHaveBeenCalled()
  })

  it("query no encontrada (findFirst retorna null): retorna {success:false}", async () => {
    mockPrismaQuery.findFirst.mockResolvedValue(null)

    const result = await submitChatFeedback("horario de apertura", 1)

    expect(result).toMatchObject({ success: false })
    expect(mockPrismaQueryResolution.update).not.toHaveBeenCalled()
  })

  it("resolucion no encontrada (query sin resolutions): retorna {success:false}", async () => {
    mockPrismaQuery.findFirst.mockResolvedValue({ ...mockQuery, resolutions: [] })

    const result = await submitChatFeedback("horario de apertura", 1)

    expect(result).toMatchObject({ success: false })
    expect(mockPrismaQueryResolution.update).not.toHaveBeenCalled()
  })

  it("feedback +1: actualiza queryResolution con {feedback:1}", async () => {
    mockPrismaQuery.findFirst.mockResolvedValue(mockQueryWithResolution)
    mockPrismaQueryResolution.update.mockResolvedValue({})

    const result = await submitChatFeedback("horario de apertura", 1)

    expect(result).toEqual({ success: true })
    expect(mockPrismaQueryResolution.update).toHaveBeenCalledWith({
      where: { id: "resolution-test-1" },
      data:  { feedback: 1 },
    })
  })

  it("feedback -1: actualiza queryResolution con {feedback:-1}", async () => {
    mockPrismaQuery.findFirst.mockResolvedValue(mockQueryWithResolution)
    mockPrismaQueryResolution.update.mockResolvedValue({})

    const result = await submitChatFeedback("horario de apertura", -1)

    expect(result).toEqual({ success: true })
    expect(mockPrismaQueryResolution.update).toHaveBeenCalledWith({
      where: { id: "resolution-test-1" },
      data:  { feedback: -1 },
    })
  })
})
