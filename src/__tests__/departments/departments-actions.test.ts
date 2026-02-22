import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const mockRequirePermission   = vi.hoisted(() => vi.fn())
const mockRevalidatePath      = vi.hoisted(() => vi.fn())

const mockTeamMoodFindMany    = vi.hoisted(() => vi.fn())
const mockTeamMoodFindUnique  = vi.hoisted(() => vi.fn())
const mockTeamMoodCreate      = vi.hoisted(() => vi.fn())
const mockTeamMoodUpdate      = vi.hoisted(() => vi.fn())
const mockTeamMoodDelete      = vi.hoisted(() => vi.fn())
const mockProjectFindMany     = vi.hoisted(() => vi.fn())

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

import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/modules/departments/actions/departments"
import type { DepartmentData } from "@/modules/departments/actions/departments"

// --- Fixtures ---
const mockMood = {
  id: "mood-1",
  departmentName: "IT",
  sentimentScore: 8,
  dominantEmotion: "Happy",
  keyConcerns: null,
  detectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const validDeptData: DepartmentData = {
  departmentName: "IT",
  sentimentScore: 8,
  dominantEmotion: "Happy",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
})

// ==================== getDepartments ====================
describe("getDepartments", () => {
  it("llama teamMood.findMany y project.findMany", async () => {
    mockTeamMoodFindMany.mockResolvedValue([mockMood])
    mockProjectFindMany.mockResolvedValue([])
    await getDepartments()
    expect(mockTeamMoodFindMany).toHaveBeenCalledTimes(1)
    expect(mockProjectFindMany).toHaveBeenCalledTimes(1)
  })

  it("calcula projectCount correctamente para cada departamento", async () => {
    mockTeamMoodFindMany.mockResolvedValue([
      { ...mockMood, departmentName: "IT" },
      { ...mockMood, id: "mood-2", departmentName: "Marketing" },
    ])
    mockProjectFindMany.mockResolvedValue([
      { department: "IT" },
      { department: "IT" },
      { department: "Marketing" },
    ])
    const result = await getDepartments()
    const itDept = result.find((d) => d.departmentName === "IT")
    const mktDept = result.find((d) => d.departmentName === "Marketing")
    expect(itDept?.projectCount).toBe(2)
    expect(mktDept?.projectCount).toBe(1)
  })

  it("departamento sin proyectos: projectCount = 0", async () => {
    mockTeamMoodFindMany.mockResolvedValue([mockMood])
    mockProjectFindMany.mockResolvedValue([])
    const result = await getDepartments()
    expect(result[0].projectCount).toBe(0)
  })

  it("retorna array con propiedades del mood más projectCount", async () => {
    mockTeamMoodFindMany.mockResolvedValue([mockMood])
    mockProjectFindMany.mockResolvedValue([{ department: "IT" }])
    const result = await getDepartments()
    expect(result[0]).toMatchObject({ ...mockMood, projectCount: 1 })
  })
})

// ==================== getDepartmentById ====================
describe("getDepartmentById", () => {
  it("llama findUnique con where:{id}", async () => {
    mockTeamMoodFindUnique.mockResolvedValue(mockMood)
    const result = await getDepartmentById("mood-1")
    expect(mockTeamMoodFindUnique).toHaveBeenCalledWith({ where: { id: "mood-1" } })
    expect(result).toEqual(mockMood)
  })

  it("retorna null cuando no existe", async () => {
    mockTeamMoodFindUnique.mockResolvedValue(null)
    const result = await getDepartmentById("no-existe")
    expect(result).toBeNull()
  })
})

// ==================== createDepartment ====================
describe("createDepartment", () => {
  it("llama requirePermission('departments', 'create')", async () => {
    mockTeamMoodCreate.mockResolvedValue({ id: "mood-1", ...validDeptData })
    await createDepartment(validDeptData)
    expect(mockRequirePermission).toHaveBeenCalledWith("departments", "create")
  })

  it("llama teamMood.create con los datos correctos", async () => {
    mockTeamMoodCreate.mockResolvedValue({ id: "mood-1", ...validDeptData })
    await createDepartment(validDeptData)
    expect(mockTeamMoodCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          departmentName: "IT",
          sentimentScore: 8,
          dominantEmotion: "Happy",
        }),
      })
    )
  })

  it("llama revalidatePath en /departments y /", async () => {
    mockTeamMoodCreate.mockResolvedValue({ id: "mood-1", ...validDeptData })
    await createDepartment(validDeptData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/departments")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("retorna {success:true, department}", async () => {
    const created = { id: "mood-1", ...validDeptData }
    mockTeamMoodCreate.mockResolvedValue(created)
    const result = await createDepartment(validDeptData)
    expect(result).toEqual({ success: true, department: created })
  })

  it("error en create: retorna {success:false, error}", async () => {
    mockTeamMoodCreate.mockRejectedValue(new Error("DB error"))
    const result = await createDepartment(validDeptData)
    expect(result).toEqual({ success: false, error: "Failed to create department" })
  })
})

// ==================== updateDepartment ====================
describe("updateDepartment", () => {
  it("llama requirePermission('departments', 'update')", async () => {
    mockTeamMoodUpdate.mockResolvedValue({ id: "mood-1", ...validDeptData })
    await updateDepartment("mood-1", validDeptData)
    expect(mockRequirePermission).toHaveBeenCalledWith("departments", "update")
  })

  it("llama teamMood.update con where:{id} y datos correctos", async () => {
    mockTeamMoodUpdate.mockResolvedValue({ id: "mood-1", ...validDeptData })
    await updateDepartment("mood-1", validDeptData)
    expect(mockTeamMoodUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mood-1" },
        data: expect.objectContaining({ departmentName: "IT", sentimentScore: 8 }),
      })
    )
  })

  it("llama revalidatePath x2", async () => {
    mockTeamMoodUpdate.mockResolvedValue({ id: "mood-1", ...validDeptData })
    await updateDepartment("mood-1", validDeptData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/departments")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("retorna {success:true, department}", async () => {
    const updated = { id: "mood-1", ...validDeptData }
    mockTeamMoodUpdate.mockResolvedValue(updated)
    const result = await updateDepartment("mood-1", validDeptData)
    expect(result).toEqual({ success: true, department: updated })
  })

  it("error en update: retorna {success:false, error}", async () => {
    mockTeamMoodUpdate.mockRejectedValue(new Error("DB error"))
    const result = await updateDepartment("mood-1", validDeptData)
    expect(result).toEqual({ success: false, error: "Failed to update department" })
  })
})

// ==================== deleteDepartment ====================
describe("deleteDepartment", () => {
  it("llama requirePermission('departments', 'delete')", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    await deleteDepartment("mood-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("departments", "delete")
  })

  it("llama teamMood.delete con where:{id}", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    await deleteDepartment("mood-1")
    expect(mockTeamMoodDelete).toHaveBeenCalledWith({ where: { id: "mood-1" } })
  })

  it("llama revalidatePath x2", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    await deleteDepartment("mood-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/departments")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("retorna {success:true}", async () => {
    mockTeamMoodDelete.mockResolvedValue(mockMood)
    const result = await deleteDepartment("mood-1")
    expect(result).toEqual({ success: true })
  })

  it("error en delete: retorna {success:false, error}", async () => {
    mockTeamMoodDelete.mockRejectedValue(new Error("DB error"))
    const result = await deleteDepartment("mood-1")
    expect(result).toEqual({ success: false, error: "Failed to delete department" })
  })
})
