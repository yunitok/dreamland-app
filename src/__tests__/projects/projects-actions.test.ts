import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const mockRequireAuth       = vi.hoisted(() => vi.fn())
const mockRevalidatePath    = vi.hoisted(() => vi.fn())
const mockGetProjectWhereFilter = vi.hoisted(() => vi.fn())

const mockProjectFindMany   = vi.hoisted(() => vi.fn())
const mockProjectFindUnique = vi.hoisted(() => vi.fn())
const mockProjectCreate     = vi.hoisted(() => vi.fn())
const mockProjectUpdate     = vi.hoisted(() => vi.fn())
const mockProjectDelete     = vi.hoisted(() => vi.fn())
const mockProjectMemberCreate = vi.hoisted(() => vi.fn())
const mockTransaction       = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany:   mockProjectFindMany,
      findUnique: mockProjectFindUnique,
      create:     mockProjectCreate,
      update:     mockProjectUpdate,
      delete:     mockProjectDelete,
    },
    projectMember: { create: mockProjectMemberCreate },
    $transaction: mockTransaction,
  },
}))

vi.mock("@/lib/actions/rbac", () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock("@/modules/shared/lib/project-filters", () => ({
  getProjectWhereFilter: mockGetProjectWhereFilter,
}))

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))

import {
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  createProject,
  getDepartments,
} from "@/modules/projects/actions/projects"
import type { ProjectUpdateData } from "@/modules/projects/actions/projects"

// --- Fixtures ---
const mockProject = {
  id: "proj-1",
  title: "Proyecto Test",
  description: "Descripcion",
  department: "IT",
  priority: "HIGH",
  type: "INTERNAL",
  status: "ACTIVE",
  sourceQuote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const validProjectData: ProjectUpdateData = {
  title: "Proyecto Test",
  description: "Descripcion",
  department: "IT",
  priority: "HIGH",
  type: "INTERNAL",
  status: "ACTIVE",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetProjectWhereFilter.mockResolvedValue({})
  mockRequireAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
})

// ==================== getProjects ====================
describe("getProjects", () => {
  it("sin filtros: llama findMany con where={}", async () => {
    mockProjectFindMany.mockResolvedValue([mockProject])
    await getProjects()
    expect(mockProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })

  it("filtro search: añade OR con title y description", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ search: "test" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where.OR).toEqual([
      { title: { contains: "test" } },
      { description: { contains: "test" } },
    ])
  })

  it("filtro department: añade where.department", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ department: "IT" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where.department).toBe("IT")
  })

  it("filtro department='all': se ignora (no añade where.department)", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ department: "all" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty("department")
  })

  it("filtro priority='all': se ignora", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ priority: "all" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty("priority")
  })

  it("filtro priority con valor real: añade where.priority", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ priority: "HIGH" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where.priority).toBe("HIGH")
  })

  it("filtro status='all': se ignora", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ status: "all" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty("status")
  })

  it("filtro type con valor real: añade where.type", async () => {
    mockProjectFindMany.mockResolvedValue([])
    await getProjects({ type: "INTERNAL" })
    const call = mockProjectFindMany.mock.calls[0][0]
    expect(call.where.type).toBe("INTERNAL")
  })
})

// ==================== getProjectById ====================
describe("getProjectById", () => {
  it("llama findUnique con where:{id}", async () => {
    mockProjectFindUnique.mockResolvedValue(mockProject)
    const result = await getProjectById("proj-1")
    expect(mockProjectFindUnique).toHaveBeenCalledWith({ where: { id: "proj-1" } })
    expect(result).toEqual(mockProject)
  })
})

// ==================== updateProject ====================
describe("updateProject", () => {
  it("llama update con datos correctos", async () => {
    mockProjectUpdate.mockResolvedValue(mockProject)
    await updateProject("proj-1", validProjectData)
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: expect.objectContaining({
        title: "Proyecto Test",
        department: "IT",
        priority: "HIGH",
      }),
    })
  })

  it("llama revalidatePath en /projects y /", async () => {
    mockProjectUpdate.mockResolvedValue(mockProject)
    await updateProject("proj-1", validProjectData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("retorna {success:true, project}", async () => {
    mockProjectUpdate.mockResolvedValue(mockProject)
    const result = await updateProject("proj-1", validProjectData)
    expect(result).toEqual({ success: true, project: mockProject })
  })

  it("error en update: retorna {success:false, error}", async () => {
    mockProjectUpdate.mockRejectedValue(new Error("DB error"))
    const result = await updateProject("proj-1", validProjectData)
    expect(result).toEqual({ success: false, error: "Failed to update project" })
  })
})

// ==================== deleteProject ====================
describe("deleteProject", () => {
  it("llama delete con where:{id}", async () => {
    mockProjectDelete.mockResolvedValue(mockProject)
    await deleteProject("proj-1")
    expect(mockProjectDelete).toHaveBeenCalledWith({ where: { id: "proj-1" } })
  })

  it("llama revalidatePath x2", async () => {
    mockProjectDelete.mockResolvedValue(mockProject)
    await deleteProject("proj-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })

  it("retorna {success:true}", async () => {
    mockProjectDelete.mockResolvedValue(mockProject)
    const result = await deleteProject("proj-1")
    expect(result).toEqual({ success: true })
  })

  it("error en delete: retorna {success:false, error}", async () => {
    mockProjectDelete.mockRejectedValue(new Error("DB error"))
    const result = await deleteProject("proj-1")
    expect(result).toEqual({ success: false, error: "Failed to delete project" })
  })
})

// ==================== createProject ====================
describe("createProject", () => {
  it("sin sesión (authenticated:false): retorna {success:false}", async () => {
    mockRequireAuth.mockResolvedValue({ authenticated: false, error: "Unauthorized" })
    const result = await createProject(validProjectData)
    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("con sesión: llama $transaction y crea project + ProjectMember OWNER", async () => {
    mockRequireAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    const txProject = { create: vi.fn().mockResolvedValue(mockProject) }
    const txProjectMember = { create: vi.fn().mockResolvedValue({}) }
    mockTransaction.mockImplementation(async (fn: (tx: { project: typeof txProject; projectMember: typeof txProjectMember }) => Promise<unknown>) =>
      fn({ project: txProject, projectMember: txProjectMember })
    )
    const result = await createProject(validProjectData)
    expect(result).toEqual({ success: true, project: mockProject })
    expect(txProject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Proyecto Test", department: "IT" }),
      })
    )
    expect(txProjectMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", role: "OWNER" }),
      })
    )
  })

  it("con sesión: llama revalidatePath x2 tras crear", async () => {
    mockRequireAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    const txProject = { create: vi.fn().mockResolvedValue(mockProject) }
    const txProjectMember = { create: vi.fn().mockResolvedValue({}) }
    mockTransaction.mockImplementation(async (fn: (tx: { project: typeof txProject; projectMember: typeof txProjectMember }) => Promise<unknown>) =>
      fn({ project: txProject, projectMember: txProjectMember })
    )
    await createProject(validProjectData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
  })

  it("error en $transaction: retorna {success:false, error}", async () => {
    mockRequireAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    mockTransaction.mockRejectedValue(new Error("DB error"))
    const result = await createProject(validProjectData)
    expect(result).toEqual({ success: false, error: "Failed to create project" })
  })
})

// ==================== getDepartments ====================
describe("getDepartments", () => {
  it("llama findMany con distinct:['department'] y devuelve array de strings", async () => {
    mockProjectFindMany.mockResolvedValue([
      { department: "IT" },
      { department: "Marketing" },
    ])
    const result = await getDepartments()
    expect(mockProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ["department"] })
    )
    expect(result).toEqual(["IT", "Marketing"])
  })

  it("retorna array vacío cuando no hay proyectos", async () => {
    mockProjectFindMany.mockResolvedValue([])
    const result = await getDepartments()
    expect(result).toEqual([])
  })
})
