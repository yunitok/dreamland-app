import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockGenerateEmbedding = vi.hoisted(() => vi.fn())
const mockGenerateEmbeddingsBatch = vi.hoisted(() => vi.fn())
const mockBuildKBText = vi.hoisted(() => vi.fn())
const mockUpsertKnowledgeVector = vi.hoisted(() => vi.fn())
const mockUpsertKnowledgeVectorsBatch = vi.hoisted(() => vi.fn())
const mockDeleteKnowledgeVectors = vi.hoisted(() => vi.fn())
const mockDeleteVectorsBySource = vi.hoisted(() => vi.fn())
const mockPrismaKB = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/lib/embeddings", () => ({
  generateEmbedding: mockGenerateEmbedding,
  generateEmbeddingsBatch: mockGenerateEmbeddingsBatch,
  buildKBText: mockBuildKBText,
}))
vi.mock("@/lib/pinecone", () => ({
  upsertKnowledgeVector: mockUpsertKnowledgeVector,
  upsertKnowledgeVectorsBatch: mockUpsertKnowledgeVectorsBatch,
  deleteKnowledgeVectors: mockDeleteKnowledgeVectors,
  deleteVectorsBySource: mockDeleteVectorsBySource,
}))
vi.mock("@/lib/prisma", () => ({ prisma: { knowledgeBase: mockPrismaKB } }))

import {
  getKnowledgeBaseEntries,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  toggleKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  bulkImportKnowledgeBaseEntries,
  syncKnowledgeBaseBySource,
} from "@/modules/atc/actions/knowledge-base"
import type { KnowledgeBaseFormValues } from "@/modules/atc/domain/schemas"
import { MOCK_EMBEDDING, createMockKBEntry } from "./helpers/mock-factories"

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
  mockGenerateEmbedding.mockResolvedValue(MOCK_EMBEDDING)
  mockGenerateEmbeddingsBatch.mockResolvedValue([MOCK_EMBEDDING, MOCK_EMBEDDING])
  mockBuildKBText.mockReturnValue("Título — Sección\n\nContenido")
  mockUpsertKnowledgeVector.mockResolvedValue(undefined)
  mockUpsertKnowledgeVectorsBatch.mockResolvedValue(undefined)
  mockDeleteKnowledgeVectors.mockResolvedValue(undefined)
  mockDeleteVectorsBySource.mockResolvedValue(undefined)
})

// ─── getKnowledgeBaseEntries ─────────────────────────────────────────────────

describe("getKnowledgeBaseEntries", () => {
  it("requiere permiso read:atc", async () => {
    mockPrismaKB.findMany.mockResolvedValue([])
    await getKnowledgeBaseEntries()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("sin filtros devuelve todas las entradas", async () => {
    const entries = [createMockKBEntry()]
    mockPrismaKB.findMany.mockResolvedValue(entries)

    const result = await getKnowledgeBaseEntries()
    expect(result).toEqual({ success: true, data: entries })
    expect(mockPrismaKB.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ source: "asc" }, { title: "asc" }],
    })
  })

  it("aplica filtros categoryId, source, active", async () => {
    mockPrismaKB.findMany.mockResolvedValue([])
    await getKnowledgeBaseEntries({ categoryId: "cat-1", source: "seed", active: true })

    expect(mockPrismaKB.findMany).toHaveBeenCalledWith({
      where: { categoryId: "cat-1", source: "seed", active: true },
      orderBy: [{ source: "asc" }, { title: "asc" }],
    })
  })
})

// ─── createKnowledgeBaseEntry ────────────────────────────────────────────────

describe("createKnowledgeBaseEntry", () => {
  const validData: KnowledgeBaseFormValues = {
    title: "Salón principal",
    content: "Capacidad de 80 comensales en mesas de 2, 4 y 6.",
    categoryId: undefined,
    section: "Espacios",
    source: "manual",
    language: "es",
    active: true,
  }

  it("requiere permiso manage:atc", async () => {
    mockPrismaKB.create.mockResolvedValue(createMockKBEntry())
    await createKnowledgeBaseEntry(validData)
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("crea en DB + genera embedding + upsert en Pinecone", async () => {
    const entry = createMockKBEntry({ id: "kb-new-1" })
    mockPrismaKB.create.mockResolvedValue(entry)

    const result = await createKnowledgeBaseEntry(validData)

    expect(result.success).toBe(true)
    expect(mockPrismaKB.create).toHaveBeenCalledTimes(1)
    expect(mockBuildKBText).toHaveBeenCalledWith(entry.title, entry.content, entry.section)
    expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1)
    expect(mockUpsertKnowledgeVector).toHaveBeenCalledWith(
      "kb-new-1",
      MOCK_EMBEDDING,
      expect.objectContaining({ title: entry.title, active: true })
    )
  })

  it("si embedding falla, la entrada se crea igualmente", async () => {
    const entry = createMockKBEntry()
    mockPrismaKB.create.mockResolvedValue(entry)
    mockGenerateEmbedding.mockRejectedValue(new Error("API down"))

    const result = await createKnowledgeBaseEntry(validData)
    expect(result.success).toBe(true)
    expect(mockPrismaKB.create).toHaveBeenCalledTimes(1)
  })

  it("llama revalidatePath tras mutación", async () => {
    mockPrismaKB.create.mockResolvedValue(createMockKBEntry())
    await createKnowledgeBaseEntry(validData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/knowledge-base")
  })

  it("valida con Zod — título demasiado corto falla", async () => {
    await expect(createKnowledgeBaseEntry({ ...validData, title: "ab" })).rejects.toThrow()
  })
})

// ─── updateKnowledgeBaseEntry ────────────────────────────────────────────────

describe("updateKnowledgeBaseEntry", () => {
  const validData: KnowledgeBaseFormValues = {
    title: "Salón actualizado",
    content: "Capacidad ampliada a 100 comensales.",
    categoryId: undefined,
    section: undefined,
    source: "manual",
    language: "es",
    active: true,
  }

  it("actualiza en DB + regenera embedding", async () => {
    const entry = createMockKBEntry({ title: validData.title })
    mockPrismaKB.update.mockResolvedValue(entry)

    const result = await updateKnowledgeBaseEntry("kb-test-1", validData)

    expect(result.success).toBe(true)
    expect(mockPrismaKB.update).toHaveBeenCalledWith({
      where: { id: "kb-test-1" },
      data: expect.objectContaining({ title: validData.title }),
    })
    expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1)
    expect(mockUpsertKnowledgeVector).toHaveBeenCalledTimes(1)
  })

  it("si embedding falla, update en DB persiste", async () => {
    mockPrismaKB.update.mockResolvedValue(createMockKBEntry())
    mockGenerateEmbedding.mockRejectedValue(new Error("API error"))

    const result = await updateKnowledgeBaseEntry("kb-test-1", validData)
    expect(result.success).toBe(true)
  })
})

// ─── toggleKnowledgeBaseEntry ────────────────────────────────────────────────

describe("toggleKnowledgeBaseEntry", () => {
  it("toggle active=false actualiza DB y Pinecone metadata", async () => {
    const entry = createMockKBEntry({ active: false })
    mockPrismaKB.update.mockResolvedValue(entry)

    const result = await toggleKnowledgeBaseEntry("kb-test-1", false)

    expect(result.success).toBe(true)
    expect(mockPrismaKB.update).toHaveBeenCalledWith({
      where: { id: "kb-test-1" },
      data: { active: false },
    })
    expect(mockUpsertKnowledgeVector).toHaveBeenCalledWith(
      "kb-test-1",
      MOCK_EMBEDDING,
      expect.objectContaining({ active: false })
    )
  })

  it("toggle active=true actualiza DB y Pinecone metadata", async () => {
    const entry = createMockKBEntry({ active: true })
    mockPrismaKB.update.mockResolvedValue(entry)

    const result = await toggleKnowledgeBaseEntry("kb-test-1", true)
    expect(result.success).toBe(true)
    expect(mockUpsertKnowledgeVector).toHaveBeenCalledWith(
      "kb-test-1",
      MOCK_EMBEDDING,
      expect.objectContaining({ active: true })
    )
  })
})

// ─── deleteKnowledgeBaseEntry ────────────────────────────────────────────────

describe("deleteKnowledgeBaseEntry", () => {
  it("requiere manage:atc", async () => {
    mockPrismaKB.delete.mockResolvedValue(undefined)
    await deleteKnowledgeBaseEntry("kb-test-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("borra Pinecone primero, luego DB", async () => {
    mockPrismaKB.delete.mockResolvedValue(undefined)
    const callOrder: string[] = []
    mockDeleteKnowledgeVectors.mockImplementation(() => { callOrder.push("pinecone"); return Promise.resolve() })
    mockPrismaKB.delete.mockImplementation(() => { callOrder.push("db"); return Promise.resolve() })

    await deleteKnowledgeBaseEntry("kb-test-1")

    expect(callOrder).toEqual(["pinecone", "db"])
    expect(mockDeleteKnowledgeVectors).toHaveBeenCalledWith(["kb-test-1"])
  })
})

// ─── bulkImportKnowledgeBaseEntries ──────────────────────────────────────────

describe("bulkImportKnowledgeBaseEntries", () => {
  it("genera batch embeddings + crea N entries + upsert batch", async () => {
    const entries = [
      { title: "Entrada 1", content: "Contenido de prueba uno." },
      { title: "Entrada 2", content: "Contenido de prueba dos." },
    ]
    mockPrismaKB.create
      .mockResolvedValueOnce(createMockKBEntry({ id: "kb-b1" }))
      .mockResolvedValueOnce(createMockKBEntry({ id: "kb-b2" }))

    const result = await bulkImportKnowledgeBaseEntries(entries)

    expect(result.success).toBe(true)
    expect(result.created).toBe(2)
    expect(mockGenerateEmbeddingsBatch).toHaveBeenCalledTimes(1)
    expect(mockPrismaKB.create).toHaveBeenCalledTimes(2)
    expect(mockUpsertKnowledgeVectorsBatch).toHaveBeenCalledTimes(1)
  })

  it("default source es 'n8n' si no se especifica", async () => {
    mockPrismaKB.create.mockResolvedValue(createMockKBEntry())
    await bulkImportKnowledgeBaseEntries([{ title: "Test", content: "Contenido mínimo de prueba." }])

    expect(mockPrismaKB.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: "n8n" }),
    })
  })
})

// ─── syncKnowledgeBaseBySource ───────────────────────────────────────────────

describe("syncKnowledgeBaseBySource", () => {
  it("borra por source en Pinecone y DB, luego re-importa", async () => {
    mockPrismaKB.deleteMany.mockResolvedValue({ count: 3 })
    mockPrismaKB.create.mockResolvedValue(createMockKBEntry())

    await syncKnowledgeBaseBySource("gstock", [
      { title: "Producto GStock", content: "Descripción del producto importado." },
    ])

    expect(mockDeleteVectorsBySource).toHaveBeenCalledWith("gstock")
    expect(mockPrismaKB.deleteMany).toHaveBeenCalledWith({ where: { source: "gstock" } })
    expect(mockPrismaKB.create).toHaveBeenCalledTimes(1)
  })

  it("entries vacío retorna created: 0 sin llamar a bulk", async () => {
    mockPrismaKB.deleteMany.mockResolvedValue({ count: 0 })

    const result = await syncKnowledgeBaseBySource("gstock", [])

    expect(result).toEqual({ success: true, created: 0 })
    expect(mockPrismaKB.create).not.toHaveBeenCalled()
  })
})
