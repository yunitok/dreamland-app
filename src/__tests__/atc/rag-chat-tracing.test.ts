import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockPrismaQueryCategoryFindFirst = vi.hoisted(() => vi.fn())
const mockPrismaQueryCreate = vi.hoisted(() => vi.fn())
const mockPrismaQueryResolutionCreate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    queryCategory: { findFirst: mockPrismaQueryCategoryFindFirst },
    query: { create: mockPrismaQueryCreate },
    queryResolution: { create: mockPrismaQueryResolutionCreate },
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Replica la lógica del onFinish del chat route para poder testearla aislada.
 * En producción está dentro de streamText() — aquí la extraemos.
 */
async function onFinish(
  text: string,
  userQuery: string,
  lastSearchTopScore: number,
  userId: string
) {
  const { prisma } = await import("@/lib/prisma")

  try {
    const defaultCategory = await prisma.queryCategory.findFirst()
    if (defaultCategory) {
      const query = await prisma.query.create({
        data: {
          guestInput: userQuery,
          categoryId: defaultCategory.id,
          channel: "WEB_RAG",
          status: lastSearchTopScore > 0 ? "RESOLVED" : "OPEN",
          confidenceScore: lastSearchTopScore,
          resolvedBy: userId,
        },
      })
      await prisma.queryResolution.create({
        data: {
          queryId: query.id,
          responseText: text,
          source: "AI",
        },
      })
    }
  } catch (e) {
    console.error("[atc/chat] Trazabilidad error:", e)
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Chat Route — onFinish tracing", () => {
  it("crea Query + QueryResolution con channel WEB_RAG y status RESOLVED", async () => {
    mockPrismaQueryCategoryFindFirst.mockResolvedValue({ id: "cat-default" })
    mockPrismaQueryCreate.mockResolvedValue({ id: "query-1" })

    await onFinish("Respuesta del asistente", "¿Tenéis terraza?", 0.85, "user-1")

    expect(mockPrismaQueryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestInput: "¿Tenéis terraza?",
        channel: "WEB_RAG",
        status: "RESOLVED",
        confidenceScore: 0.85,
        resolvedBy: "user-1",
      }),
    })
    expect(mockPrismaQueryResolutionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        queryId: "query-1",
        responseText: "Respuesta del asistente",
        source: "AI",
      }),
    })
  })

  it("status OPEN cuando lastSearchTopScore es 0", async () => {
    mockPrismaQueryCategoryFindFirst.mockResolvedValue({ id: "cat-default" })
    mockPrismaQueryCreate.mockResolvedValue({ id: "query-2" })

    await onFinish("No encontré información.", "¿Precio del bitcoin?", 0, "user-1")

    expect(mockPrismaQueryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "OPEN", confidenceScore: 0 }),
    })
  })

  it("no crea nada si no hay categoría por defecto", async () => {
    mockPrismaQueryCategoryFindFirst.mockResolvedValue(null)

    await onFinish("Respuesta", "Query", 0.5, "user-1")

    expect(mockPrismaQueryCreate).not.toHaveBeenCalled()
    expect(mockPrismaQueryResolutionCreate).not.toHaveBeenCalled()
  })

  it("error en trazabilidad no propaga excepción", async () => {
    mockPrismaQueryCategoryFindFirst.mockResolvedValue({ id: "cat-default" })
    mockPrismaQueryCreate.mockRejectedValue(new Error("DB constraint violation"))

    // No debe lanzar
    await expect(onFinish("Respuesta", "Query", 0.5, "user-1")).resolves.toBeUndefined()
  })

  it("confidenceScore refleja el topScore de la última búsqueda", async () => {
    mockPrismaQueryCategoryFindFirst.mockResolvedValue({ id: "cat-default" })
    mockPrismaQueryCreate.mockResolvedValue({ id: "query-3" })

    await onFinish("Respuesta", "Query", 0.92, "user-1")

    expect(mockPrismaQueryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ confidenceScore: 0.92 }),
    })
  })
})
