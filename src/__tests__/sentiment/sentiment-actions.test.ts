import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const mockRequirePermission  = vi.hoisted(() => vi.fn())
const mockRevalidatePath     = vi.hoisted(() => vi.fn())
const mockSafeParse          = vi.hoisted(() => vi.fn())

const mockTeamMoodFindMany   = vi.hoisted(() => vi.fn())
const mockTeamMoodFindUnique = vi.hoisted(() => vi.fn())
const mockTeamMoodCreate     = vi.hoisted(() => vi.fn())
const mockTeamMoodUpdate     = vi.hoisted(() => vi.fn())
const mockTeamMoodDelete     = vi.hoisted(() => vi.fn())
const mockProjectFindMany    = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    teamMood: {
      findMany:   mockTeamMoodFindMany,
      findUnique: mockTeamMoodFindUnique,
      create:     mockTeamMoodCreate,
      update:     mockTeamMoodUpdate,
      delete:     mockTeamMoodDelete,
    },
    project: { findMany: mockProjectFindMany },
  },
}))

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))

vi.mock("@/lib/validations/sentiment", () => ({
  teamMoodSchema: { safeParse: mockSafeParse },
}))

import {
  createTeamMood,
  updateTeamMood,
  deleteTeamMood,
  getTeamMoods,
  getTeamMoodById,
} from "@/modules/sentiment/actions/sentiment"

// --- Fixtures ---
const mockMood = {
  id: "mood-1",
  departmentName: "IT",
  sentimentScore: 7,
  dominantEmotion: "Happy",
  keyConcerns: null,
  detectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const validParsedData = {
  departmentName: "IT",
  sentimentScore: 7,
  dominantEmotion: "Happy",
}

const validInput = { departmentName: "IT", sentimentScore: 7, dominantEmotion: "Happy" }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
  mockSafeParse.mockReturnValue({ success: true, data: validParsedData })
})

// ==================== createTeamMood ====================
describe("createTeamMood", () => {
  it("safeParse falla: retorna {error:'Validation failed'}", async () => {
    mockSafeParse.mockReturnValue({ success: false, error: { issues: [] } })
    const result = await createTeamMood(validInput as never)
    expect(result).toEqual({ error: "Validation failed" })
    expect(mockTeamMoodCreate).not.toHaveBeenCalled()
  })

  it("safeParse ok: llama teamMood.create con los datos parseados", async () => {
    mockTeamMoodCreate.mockResolvedValue(mockMood)
    await createTeamMood(validInput as never)
    expect(mockTeamMoodCreate).toHaveBeenCalledWith({ data: validParsedData })
  })

  it("safeParse ok: llama revalidatePath en /sentiment y /sentiment/history", async () => {
    mockTeamMoodCreate.mockResolvedValue(mockMood)
    await createTeamMood(validInput as never)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sentiment")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sentiment/history")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("safeParse ok: retorna {success:true}", async () => {
    mockTeamMoodCreate.mockResolvedValue(mockMood)
    const result = await createTeamMood(validInput as never)
    expect(result).toEqual({ success: true })
  })

  it("llama requirePermission('sentiment', 'create')", async () => {
    mockTeamMoodCreate.mockResolvedValue(mockMood)
    await createTeamMood(validInput as never)
    expect(mockRequirePermission).toHaveBeenCalledWith("sentiment", "create")
  })

  it("error en create: retorna {error:'Failed to create mood record'}", async () => {
    mockTeamMoodCreate.mockRejectedValue(new Error("DB error"))
    const result = await createTeamMood(validInput as never)
    expect(result).toEqual({ error: "Failed to create mood record" })
  })
})

// ==================== updateTeamMood ====================
describe("updateTeamMood", () => {
  it("safeParse falla: retorna {error:'Validation failed'}", async () => {
    mockSafeParse.mockReturnValue({ success: false, error: { issues: [] } })
    const result = await updateTeamMood("mood-1", validInput as never)
    expect(result).toEqual({ error: "Validation failed" })
    expect(mockTeamMoodUpdate).not.toHaveBeenCalled()
  })

  it("safeParse ok: llama teamMood.update con where:{id} y datos parseados", async () => {
    mockTeamMoodUpdate.mockResolvedValue(mockMood)
    await updateTeamMood("mood-1", validInput as never)
    expect(mockTeamMoodUpdate).toHaveBeenCalledWith({
      where: { id: "mood-1" },
      data: validParsedData,
    })
  })

  it("safeParse ok: llama revalidatePath x2", async () => {
    mockTeamMoodUpdate.mockResolvedValue(mockMood)
    await updateTeamMood("mood-1", validInput as never)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sentiment")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sentiment/history")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("safeParse ok: retorna {success:true}", async () => {
    mockTeamMoodUpdate.mockResolvedValue(mockMood)
    const result = await updateTeamMood("mood-1", validInput as never)
    expect(result).toEqual({ success: true })
  })

  it("llama requirePermission('sentiment', 'update')", async () => {
    mockTeamMoodUpdate.mockResolvedValue(mockMood)
    await updateTeamMood("mood-1", validInput as never)
    expect(mockRequirePermission).toHaveBeenCalledWith("sentiment", "update")
  })

  it("error en update: retorna {error:'Failed to update mood record'}", async () => {
    mockTeamMoodUpdate.mockRejectedValue(new Error("DB error"))
    const result = await updateTeamMood("mood-1", validInput as never)
    expect(result).toEqual({ error: "Failed to update mood record" })
  })
})

// ==================== deleteTeamMood ====================
describe("deleteTeamMood", () => {
  it("llama requirePermission('sentiment', 'delete')", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    await deleteTeamMood("mood-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("sentiment", "delete")
  })

  it("llama teamMood.delete con where:{id}", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    await deleteTeamMood("mood-1")
    expect(mockTeamMoodDelete).toHaveBeenCalledWith({ where: { id: "mood-1" } })
  })

  it("llama revalidatePath en /sentiment y /sentiment/history", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    await deleteTeamMood("mood-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sentiment")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sentiment/history")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("retorna {success:true}", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    const result = await deleteTeamMood("mood-1")
    expect(result).toEqual({ success: true })
  })

  it("error en delete: retorna {error:'Failed to delete mood record'}", async () => {
    mockTeamMoodDelete.mockRejectedValue(new Error("DB error"))
    const result = await deleteTeamMood("mood-1")
    expect(result).toEqual({ error: "Failed to delete mood record" })
  })
})

// ==================== getTeamMoods ====================
describe("getTeamMoods", () => {
  it("llama findMany con orderBy:{detectedAt:'desc'}", async () => {
    mockTeamMoodFindMany.mockResolvedValue([mockMood])
    await getTeamMoods()
    expect(mockTeamMoodFindMany).toHaveBeenCalledWith({
      orderBy: { detectedAt: "desc" },
    })
  })

  it("retorna {success:true, data} con la lista de moods", async () => {
    mockTeamMoodFindMany.mockResolvedValue([mockMood])
    const result = await getTeamMoods()
    expect(result).toEqual({ success: true, data: [mockMood] })
  })

  it("error en findMany: retorna {success:false, error}", async () => {
    mockTeamMoodFindMany.mockRejectedValue(new Error("DB error"))
    const result = await getTeamMoods()
    expect(result).toEqual({ success: false, error: "Failed to fetch moods" })
  })
})

// ==================== getTeamMoodById ====================
describe("getTeamMoodById", () => {
  it("mood encontrado: retorna {success:true, data}", async () => {
    mockTeamMoodFindUnique.mockResolvedValue(mockMood)
    const result = await getTeamMoodById("mood-1")
    expect(result).toEqual({ success: true, data: mockMood })
  })

  it("llama findUnique con where:{id}", async () => {
    mockTeamMoodFindUnique.mockResolvedValue(mockMood)
    await getTeamMoodById("mood-1")
    expect(mockTeamMoodFindUnique).toHaveBeenCalledWith({ where: { id: "mood-1" } })
  })

  it("mood no encontrado (null): retorna {success:false, error:'Mood not found'}", async () => {
    mockTeamMoodFindUnique.mockResolvedValue(null)
    const result = await getTeamMoodById("no-existe")
    expect(result).toEqual({ success: false, error: "Mood not found" })
  })

  it("error en findUnique: retorna {success:false, error}", async () => {
    mockTeamMoodFindUnique.mockRejectedValue(new Error("DB error"))
    const result = await getTeamMoodById("mood-1")
    expect(result).toEqual({ success: false, error: "Failed to fetch mood" })
  })
})
