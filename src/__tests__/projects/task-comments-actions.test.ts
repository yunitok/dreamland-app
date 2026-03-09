/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockHasProjectAccess = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockCreateNotification = vi.hoisted(() => vi.fn())

const mockTask = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

const mockTaskComment = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const mockUser = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({
  hasProjectAccess: mockHasProjectAccess,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/notification-service", () => ({
  createNotification: mockCreateNotification,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: mockTask,
    taskComment: mockTaskComment,
    user: mockUser,
  },
}))

import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from "@/modules/projects/actions/task-comments"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROJECT_ID = "proj-1"
const TASK_ID = "task-1"
const AUTHOR_ID = "user-1"

const MOCK_TASK = {
  id: TASK_ID,
  title: "Mi tarea",
  assigneeId: "user-2",
  list: { projectId: PROJECT_ID },
}

const MOCK_COMMENT = {
  id: "comment-1",
  content: "Un comentario",
  taskId: TASK_ID,
  authorId: AUTHOR_ID,
  author: { id: AUTHOR_ID, name: "Test", image: null },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getComments", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve comentarios de una tarea", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskComment.findMany.mockResolvedValue([MOCK_COMMENT])

    const result = await getComments(TASK_ID)

    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "VIEWER")
    expect(result).toEqual([MOCK_COMMENT])
  })

  it("devuelve array vacio si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)

    const result = await getComments(TASK_ID)

    expect(result).toEqual([])
  })

  it("lanza error si no tiene acceso", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(getComments(TASK_ID)).rejects.toThrow("Forbidden")
  })
})

describe("createComment", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("crea un comentario y notifica al asignado", async () => {
    mockTask.findUnique.mockResolvedValue(MOCK_TASK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskComment.create.mockResolvedValue(MOCK_COMMENT)
    mockCreateNotification.mockResolvedValue(undefined)

    const result = await createComment(TASK_ID, "Un comentario", AUTHOR_ID)

    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "EDITOR")
    expect(mockTaskComment.create).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: "TASK_COMMENTED",
      })
    )
    expect(result).toEqual(MOCK_COMMENT)
  })

  it("notifica a usuarios mencionados con @", async () => {
    mockTask.findUnique.mockResolvedValue({ ...MOCK_TASK, assigneeId: null })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskComment.create.mockResolvedValue(MOCK_COMMENT)
    mockUser.findMany.mockResolvedValue([{ id: "user-3" }])
    mockCreateNotification.mockResolvedValue(undefined)

    await createComment(TASK_ID, "Hola @carlos", AUTHOR_ID)

    expect(mockUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: { in: ["carlos"] } },
      })
    )
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-3",
        type: "TASK_COMMENTED",
      })
    )
  })

  it("lanza error si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)

    await expect(createComment(TASK_ID, "Hola", AUTHOR_ID)).rejects.toThrow("Task not found")
  })

  it("lanza error si no tiene acceso EDITOR", async () => {
    mockTask.findUnique.mockResolvedValue(MOCK_TASK)
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(createComment(TASK_ID, "Hola", AUTHOR_ID)).rejects.toThrow("Forbidden")
  })
})

describe("updateComment", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("actualiza un comentario propio", async () => {
    const commentWithTask = {
      ...MOCK_COMMENT,
      task: { list: { projectId: PROJECT_ID } },
    }
    mockTaskComment.findUnique.mockResolvedValue(commentWithTask)
    mockHasProjectAccess.mockResolvedValue(true)
    const updated = { ...MOCK_COMMENT, content: "Editado" }
    mockTaskComment.update.mockResolvedValue(updated)

    const result = await updateComment("comment-1", "Editado", AUTHOR_ID)

    expect(result).toEqual(updated)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
  })

  it("lanza error si el comentario no existe", async () => {
    mockTaskComment.findUnique.mockResolvedValue(null)

    await expect(updateComment("xxx", "Editado", AUTHOR_ID)).rejects.toThrow("Comment not found")
  })

  it("lanza error si no es el autor", async () => {
    mockTaskComment.findUnique.mockResolvedValue({
      ...MOCK_COMMENT,
      authorId: "otro-user",
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)

    await expect(updateComment("comment-1", "Editado", AUTHOR_ID)).rejects.toThrow(
      "Not authorized to edit this comment"
    )
  })
})

describe("deleteComment", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("elimina un comentario propio", async () => {
    mockTaskComment.findUnique.mockResolvedValue({
      ...MOCK_COMMENT,
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskComment.delete.mockResolvedValue(undefined)

    const result = await deleteComment("comment-1", AUTHOR_ID)

    expect(result).toEqual({ success: true })
    expect(mockTaskComment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } })
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
  })

  it("lanza error si no es el autor", async () => {
    mockTaskComment.findUnique.mockResolvedValue({
      ...MOCK_COMMENT,
      authorId: "otro-user",
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)

    await expect(deleteComment("comment-1", AUTHOR_ID)).rejects.toThrow(
      "Not authorized to delete this comment"
    )
  })

  it("lanza error si el comentario no existe", async () => {
    mockTaskComment.findUnique.mockResolvedValue(null)

    await expect(deleteComment("xxx", AUTHOR_ID)).rejects.toThrow("Comment not found")
  })

  it("lanza error si prisma falla al eliminar", async () => {
    mockTaskComment.findUnique.mockResolvedValue({
      ...MOCK_COMMENT,
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskComment.delete.mockRejectedValue(new Error("DB error"))

    await expect(deleteComment("comment-1", AUTHOR_ID)).rejects.toThrow("DB error")
  })
})
