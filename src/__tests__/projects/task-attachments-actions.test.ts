/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockHasProjectAccess = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockUploadToStorage = vi.hoisted(() => vi.fn())
const mockDeleteFromStorage = vi.hoisted(() => vi.fn())
const mockGetSignedUrl = vi.hoisted(() => vi.fn())

const mockTask = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

const mockTaskAttachment = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({
  hasProjectAccess: mockHasProjectAccess,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/supabase-storage", () => ({
  uploadToStorage: mockUploadToStorage,
  deleteFromStorage: mockDeleteFromStorage,
  getSignedUrl: mockGetSignedUrl,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: mockTask,
    taskAttachment: mockTaskAttachment,
  },
}))

import {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
} from "@/modules/projects/actions/task-attachments"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROJECT_ID = "proj-1"
const TASK_ID = "task-1"
const USER_ID = "user-1"

const MOCK_ATTACHMENT = {
  id: "att-1",
  filename: "doc.pdf",
  filepath: "tasks/task-1/123.pdf",
  filesize: 5000,
  mimetype: "application/pdf",
  taskId: TASK_ID,
  uploaderId: USER_ID,
  createdAt: new Date(),
  uploader: { id: USER_ID, name: "Test User" },
}

const MOCK_FILE = {
  name: "doc.pdf",
  type: "application/pdf",
  size: 5000,
  data: new ArrayBuffer(5000),
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getAttachments", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve adjuntos con URLs firmadas", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskAttachment.findMany.mockResolvedValue([MOCK_ATTACHMENT])
    mockGetSignedUrl.mockResolvedValue("https://signed-url.com/doc.pdf")

    const result = await getAttachments(TASK_ID)

    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "VIEWER")
    expect(result).toHaveLength(1)
    expect(result[0].filepath).toBe("https://signed-url.com/doc.pdf")
  })

  it("devuelve adjuntos legacy sin firmar URL", async () => {
    const legacyAttachment = { ...MOCK_ATTACHMENT, filepath: "/uploads/old-file.pdf" }
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskAttachment.findMany.mockResolvedValue([legacyAttachment])

    const result = await getAttachments(TASK_ID)

    expect(mockGetSignedUrl).not.toHaveBeenCalled()
    expect(result[0].filepath).toBe("/uploads/old-file.pdf")
  })

  it("devuelve array vacio si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)

    const result = await getAttachments(TASK_ID)

    expect(result).toEqual([])
  })

  it("lanza error si no tiene acceso", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(getAttachments(TASK_ID)).rejects.toThrow("Forbidden")
  })

  it("devuelve adjunto original si getSignedUrl falla", async () => {
    mockTask.findUnique.mockResolvedValue({ list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskAttachment.findMany.mockResolvedValue([MOCK_ATTACHMENT])
    mockGetSignedUrl.mockRejectedValue(new Error("Storage error"))

    const result = await getAttachments(TASK_ID)

    expect(result[0].filepath).toBe("tasks/task-1/123.pdf")
  })
})

describe("uploadAttachment", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("sube un adjunto correctamente", async () => {
    mockTask.findUnique.mockResolvedValue({ id: TASK_ID, list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    mockUploadToStorage.mockResolvedValue(undefined)
    mockTaskAttachment.create.mockResolvedValue(MOCK_ATTACHMENT)

    const result = await uploadAttachment(TASK_ID, USER_ID, MOCK_FILE)

    expect(mockUploadToStorage).toHaveBeenCalledWith(
      "attachments",
      expect.stringContaining("tasks/task-1/"),
      expect.any(Buffer),
      "application/pdf"
    )
    expect(mockTaskAttachment.create).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(result).toEqual(MOCK_ATTACHMENT)
  })

  it("lanza error si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)

    await expect(uploadAttachment(TASK_ID, USER_ID, MOCK_FILE)).rejects.toThrow("Task not found")
  })

  it("lanza error si el archivo excede 10MB", async () => {
    mockTask.findUnique.mockResolvedValue({ id: TASK_ID, list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)

    const bigFile = { ...MOCK_FILE, size: 11 * 1024 * 1024 }

    await expect(uploadAttachment(TASK_ID, USER_ID, bigFile)).rejects.toThrow(
      "File size exceeds 10MB limit"
    )
  })

  it("lanza error si no tiene acceso EDITOR", async () => {
    mockTask.findUnique.mockResolvedValue({ id: TASK_ID, list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(uploadAttachment(TASK_ID, USER_ID, MOCK_FILE)).rejects.toThrow("Forbidden")
  })

  it("lanza error si el storage falla", async () => {
    mockTask.findUnique.mockResolvedValue({ id: TASK_ID, list: { projectId: PROJECT_ID } })
    mockHasProjectAccess.mockResolvedValue(true)
    mockUploadToStorage.mockRejectedValue(new Error("Storage error"))

    await expect(uploadAttachment(TASK_ID, USER_ID, MOCK_FILE)).rejects.toThrow("Storage error")
  })
})

describe("deleteAttachment", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("elimina un adjunto de Supabase y DB", async () => {
    mockTaskAttachment.findUnique.mockResolvedValue({
      ...MOCK_ATTACHMENT,
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)
    mockDeleteFromStorage.mockResolvedValue(undefined)
    mockTaskAttachment.delete.mockResolvedValue(undefined)

    const result = await deleteAttachment("att-1", USER_ID)

    expect(mockDeleteFromStorage).toHaveBeenCalledWith("attachments", "tasks/task-1/123.pdf")
    expect(mockTaskAttachment.delete).toHaveBeenCalledWith({ where: { id: "att-1" } })
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(result).toEqual({ success: true })
  })

  it("no elimina de storage si es registro legacy", async () => {
    mockTaskAttachment.findUnique.mockResolvedValue({
      ...MOCK_ATTACHMENT,
      filepath: "/uploads/old.pdf",
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)
    mockTaskAttachment.delete.mockResolvedValue(undefined)

    await deleteAttachment("att-1", USER_ID)

    expect(mockDeleteFromStorage).not.toHaveBeenCalled()
  })

  it("lanza error si el adjunto no existe", async () => {
    mockTaskAttachment.findUnique.mockResolvedValue(null)

    await expect(deleteAttachment("xxx", USER_ID)).rejects.toThrow("Attachment not found")
  })

  it("lanza error si no es el uploader", async () => {
    mockTaskAttachment.findUnique.mockResolvedValue({
      ...MOCK_ATTACHMENT,
      uploaderId: "otro-user",
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)

    await expect(deleteAttachment("att-1", USER_ID)).rejects.toThrow(
      "Not authorized to delete this attachment"
    )
  })

  it("continua eliminando de DB aunque storage falle", async () => {
    mockTaskAttachment.findUnique.mockResolvedValue({
      ...MOCK_ATTACHMENT,
      task: { list: { projectId: PROJECT_ID } },
    })
    mockHasProjectAccess.mockResolvedValue(true)
    mockDeleteFromStorage.mockRejectedValue(new Error("Storage error"))
    mockTaskAttachment.delete.mockResolvedValue(undefined)

    const result = await deleteAttachment("att-1", USER_ID)

    expect(result).toEqual({ success: true })
    expect(mockTaskAttachment.delete).toHaveBeenCalled()
  })
})
