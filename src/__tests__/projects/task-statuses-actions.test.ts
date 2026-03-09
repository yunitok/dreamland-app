/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRevalidatePath = vi.hoisted(() => vi.fn())

const mockTaskStatus = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
}))

const mockTransaction = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskStatus: mockTaskStatus,
    $transaction: mockTransaction,
  },
}))

import {
  getTaskStatuses,
  reorderTaskStatuses,
  createDefaultStatuses,
} from "@/modules/projects/actions/task-statuses"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_STATUSES = [
  { id: "status-1", name: "To Do", color: "#gray", position: 0, isClosed: false, isDefault: true, _count: { tasks: 5 } },
  { id: "status-2", name: "In Progress", color: "#blue", position: 1, isClosed: false, isDefault: false, _count: { tasks: 3 } },
  { id: "status-3", name: "Done", color: "#green", position: 2, isClosed: true, isDefault: false, _count: { tasks: 10 } },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getTaskStatuses", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve todos los estados ordenados por posicion", async () => {
    mockTaskStatus.findMany.mockResolvedValue(MOCK_STATUSES)

    const result = await getTaskStatuses()

    expect(mockTaskStatus.findMany).toHaveBeenCalledWith({
      include: { _count: { select: { tasks: true } } },
      orderBy: { position: "asc" },
    })
    expect(result).toEqual(MOCK_STATUSES)
  })

  it("devuelve array vacio si no hay estados", async () => {
    mockTaskStatus.findMany.mockResolvedValue([])

    const result = await getTaskStatuses()

    expect(result).toEqual([])
  })

  it("lanza error si prisma falla", async () => {
    mockTaskStatus.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getTaskStatuses()).rejects.toThrow("DB error")
  })
})

describe("reorderTaskStatuses", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("reordena estados usando transaccion", async () => {
    mockTaskStatus.update.mockReturnValue(Promise.resolve({}))
    mockTransaction.mockResolvedValue(undefined)

    const statusIds = ["status-3", "status-1", "status-2"]
    const result = await reorderTaskStatuses("proj-1", statusIds)

    expect(mockTransaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Promise),
        expect.any(Promise),
        expect.any(Promise),
      ])
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    expect(result).toEqual({ success: true })
  })

  it("crea update con posicion correcta para cada ID", async () => {
    mockTransaction.mockResolvedValue(undefined)

    const statusIds = ["status-2", "status-1"]
    await reorderTaskStatuses("proj-1", statusIds)

    // Verificar que taskStatus.update fue llamado para cada ID
    expect(mockTaskStatus.update).toHaveBeenCalledWith({
      where: { id: "status-2" },
      data: { position: 0 },
    })
    expect(mockTaskStatus.update).toHaveBeenCalledWith({
      where: { id: "status-1" },
      data: { position: 1 },
    })
  })

  it("lanza error si la transaccion falla", async () => {
    mockTransaction.mockRejectedValue(new Error("Transaction failed"))

    await expect(
      reorderTaskStatuses("proj-1", ["status-1"])
    ).rejects.toThrow("Transaction failed")
  })
})

describe("createDefaultStatuses", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve estados globales existentes", async () => {
    mockTaskStatus.findMany.mockResolvedValue(MOCK_STATUSES)

    const result = await createDefaultStatuses()

    expect(mockTaskStatus.findMany).toHaveBeenCalledWith({
      orderBy: { position: "asc" },
    })
    expect(result).toEqual(MOCK_STATUSES)
  })

  it("devuelve array vacio si no hay estados", async () => {
    mockTaskStatus.findMany.mockResolvedValue([])

    const result = await createDefaultStatuses()

    expect(result).toEqual([])
  })

  it("lanza error si prisma falla", async () => {
    mockTaskStatus.findMany.mockRejectedValue(new Error("DB error"))

    await expect(createDefaultStatuses()).rejects.toThrow("DB error")
  })
})
