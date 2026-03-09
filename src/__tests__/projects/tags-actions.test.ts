/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockHasProjectAccess = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())

const mockTag = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const mockTask = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({
  hasProjectAccess: mockHasProjectAccess,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: mockTag,
    task: mockTask,
  },
}))

import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToTask,
  removeTagFromTask,
} from "@/modules/projects/actions/tags"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROJECT_ID = "proj-1"

const MOCK_TAG = {
  id: "tag-1",
  name: "Bug",
  color: "#EF4444",
  projectId: PROJECT_ID,
  _count: { tasks: 3 },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getTags", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve tags del proyecto", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.findMany.mockResolvedValue([MOCK_TAG])

    const result = await getTags(PROJECT_ID)

    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "VIEWER")
    expect(result).toEqual([MOCK_TAG])
  })

  it("lanza error si no tiene acceso", async () => {
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(getTags(PROJECT_ID)).rejects.toThrow("Forbidden")
  })
})

describe("createTag", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("crea un tag correctamente", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.findUnique.mockResolvedValue(null)
    mockTag.create.mockResolvedValue(MOCK_TAG)

    const result = await createTag({ name: "Bug", color: "#EF4444", projectId: PROJECT_ID })

    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "MANAGER")
    expect(mockTag.create).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(result).toEqual(MOCK_TAG)
  })

  it("usa color por defecto si no se proporciona", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.findUnique.mockResolvedValue(null)
    mockTag.create.mockResolvedValue(MOCK_TAG)

    await createTag({ name: "Feature", projectId: PROJECT_ID })

    expect(mockTag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ color: "#3B82F6" }),
      })
    )
  })

  it("lanza error si ya existe un tag con ese nombre", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.findUnique.mockResolvedValue(MOCK_TAG)

    await expect(
      createTag({ name: "Bug", projectId: PROJECT_ID })
    ).rejects.toThrow("A tag with this name already exists in this project")
  })

  it("lanza error si no tiene acceso MANAGER", async () => {
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(
      createTag({ name: "Bug", projectId: PROJECT_ID })
    ).rejects.toThrow("Forbidden")
  })
})

describe("updateTag", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("actualiza un tag existente", async () => {
    mockTag.findUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.findFirst.mockResolvedValue(null)
    const updated = { ...MOCK_TAG, name: "Feature" }
    mockTag.update.mockResolvedValue(updated)

    const result = await updateTag("tag-1", { name: "Feature" })

    expect(result).toEqual(updated)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
  })

  it("lanza error si el tag no existe", async () => {
    mockTag.findUnique.mockResolvedValue(null)

    await expect(updateTag("xxx", { name: "New" })).rejects.toThrow("Tag not found")
  })

  it("lanza error si el nuevo nombre ya existe en el proyecto", async () => {
    mockTag.findUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.findFirst.mockResolvedValue({ id: "tag-2", name: "Existing" })

    await expect(updateTag("tag-1", { name: "Existing" })).rejects.toThrow(
      "A tag with this name already exists in this project"
    )
  })

  it("lanza error si no tiene acceso MANAGER", async () => {
    mockTag.findUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(updateTag("tag-1", { name: "New" })).rejects.toThrow("Forbidden")
  })
})

describe("deleteTag", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("elimina un tag correctamente", async () => {
    mockTag.findUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.delete.mockResolvedValue(undefined)

    const result = await deleteTag("tag-1")

    expect(mockTag.delete).toHaveBeenCalledWith({ where: { id: "tag-1" } })
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(result).toEqual({ success: true })
  })

  it("lanza error si el tag no existe", async () => {
    mockTag.findUnique.mockResolvedValue(null)

    await expect(deleteTag("xxx")).rejects.toThrow("Tag not found")
  })

  it("lanza error si no tiene acceso MANAGER", async () => {
    mockTag.findUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(deleteTag("tag-1")).rejects.toThrow("Forbidden")
  })

  it("lanza error si prisma falla", async () => {
    mockTag.findUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTag.delete.mockRejectedValue(new Error("DB error"))

    await expect(deleteTag("tag-1")).rejects.toThrow("DB error")
  })
})

describe("addTagToTask", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("asigna un tag a una tarea", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    const updatedTask = {
      id: "task-1",
      tags: [MOCK_TAG],
      list: { projectId: PROJECT_ID },
    }
    mockTask.update.mockResolvedValue(updatedTask)

    const result = await addTagToTask("task-1", "tag-1")

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: { tags: { connect: { id: "tag-1" } } },
      })
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(result).toEqual(updatedTask)
  })

  it("lanza error si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)

    await expect(addTagToTask("xxx", "tag-1")).rejects.toThrow("Task not found")
  })

  it("lanza error si no tiene acceso EDITOR", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(addTagToTask("task-1", "tag-1")).rejects.toThrow("Forbidden")
  })
})

describe("removeTagFromTask", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("desasocia un tag de una tarea", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    const updatedTask = {
      id: "task-1",
      tags: [],
      list: { projectId: PROJECT_ID },
    }
    mockTask.update.mockResolvedValue(updatedTask)

    const result = await removeTagFromTask("task-1", "tag-1")

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: { tags: { disconnect: { id: "tag-1" } } },
      })
    )
    expect(result).toEqual(updatedTask)
  })

  it("lanza error si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)

    await expect(removeTagFromTask("xxx", "tag-1")).rejects.toThrow("Task not found")
  })

  it("lanza error si no tiene acceso EDITOR", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(removeTagFromTask("task-1", "tag-1")).rejects.toThrow("Forbidden")
  })
})
