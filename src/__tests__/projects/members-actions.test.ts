/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockHasProjectAccess = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockCreateNotification = vi.hoisted(() => vi.fn())

const mockProjectMember = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  count: vi.fn(),
  delete: vi.fn(),
}))

const mockUser = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

const mockProject = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({
  requireAuth: mockRequireAuth,
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
    projectMember: mockProjectMember,
    user: mockUser,
    project: mockProject,
  },
}))

import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  getUsersWithProjectAccess,
} from "@/modules/projects/actions/members"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_OK = { authenticated: true, userId: "user-1", isSuperAdmin: false }
const PROJECT_ID = "proj-1"

const MOCK_MEMBER = {
  id: "member-1",
  userId: "user-2",
  projectId: PROJECT_ID,
  role: "EDITOR",
  user: { id: "user-2", name: "Test User", email: "test@example.com", image: null, username: "testuser" },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getProjectMembers", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve los miembros del proyecto", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findMany.mockResolvedValue([MOCK_MEMBER])

    const result = await getProjectMembers(PROJECT_ID)

    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "VIEWER")
    expect(result).toEqual([MOCK_MEMBER])
  })

  it("lanza error si no tiene acceso", async () => {
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(getProjectMembers(PROJECT_ID)).rejects.toThrow("Forbidden")
  })

  it("lanza error si prisma falla", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getProjectMembers(PROJECT_ID)).rejects.toThrow("DB error")
  })
})

describe("addProjectMember", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("añade un miembro con rol EDITOR", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique.mockResolvedValue({ role: "MANAGER" })
    mockProjectMember.upsert.mockResolvedValue(MOCK_MEMBER)
    mockProject.findUnique.mockResolvedValue({ title: "Mi Proyecto" })
    mockCreateNotification.mockResolvedValue(undefined)

    const result = await addProjectMember(PROJECT_ID, "user-2", "EDITOR" as any)

    expect(mockRequireAuth).toHaveBeenCalled()
    expect(mockHasProjectAccess).toHaveBeenCalledWith(PROJECT_ID, "MANAGER")
    expect(mockProjectMember.upsert).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(mockCreateNotification).toHaveBeenCalled()
    expect(result).toEqual(MOCK_MEMBER)
  })

  it("lanza error si no está autenticado", async () => {
    mockRequireAuth.mockResolvedValue({ authenticated: false, error: "Unauthorized" })

    await expect(addProjectMember(PROJECT_ID, "user-2", "EDITOR" as any)).rejects.toThrow("Unauthorized")
  })

  it("lanza error si intenta asignar rol superior al propio", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique.mockResolvedValue({ role: "EDITOR" })

    await expect(addProjectMember(PROJECT_ID, "user-2", "OWNER" as any)).rejects.toThrow(
      "Cannot assign a role higher than your own"
    )
  })

  it("lanza error si no tiene acceso MANAGER", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(addProjectMember(PROJECT_ID, "user-2", "VIEWER" as any)).rejects.toThrow("Forbidden")
  })
})

describe("updateProjectMember", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("delega a addProjectMember", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique.mockResolvedValue({ role: "OWNER" })
    mockProjectMember.upsert.mockResolvedValue(MOCK_MEMBER)
    mockProject.findUnique.mockResolvedValue({ title: "Proyecto" })
    mockCreateNotification.mockResolvedValue(undefined)

    const result = await updateProjectMember(PROJECT_ID, "user-2", "EDITOR" as any)

    expect(result).toEqual(MOCK_MEMBER)
  })
})

describe("removeProjectMember", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("elimina un miembro con rol inferior", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique
      .mockResolvedValueOnce({ role: "VIEWER", userId: "user-2", projectId: PROJECT_ID }) // target
      .mockResolvedValueOnce({ role: "MANAGER" }) // caller
    mockProjectMember.delete.mockResolvedValue(undefined)

    const result = await removeProjectMember(PROJECT_ID, "user-2")

    expect(result).toEqual({ success: true })
    expect(mockProjectMember.delete).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
  })

  it("lanza error si el miembro no existe", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique.mockResolvedValue(null)

    await expect(removeProjectMember(PROJECT_ID, "user-2")).rejects.toThrow("Member not found")
  })

  it("lanza error si intenta eliminar al último OWNER", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" })
    mockProjectMember.count.mockResolvedValue(1)

    await expect(removeProjectMember(PROJECT_ID, "user-2")).rejects.toThrow(
      "Cannot remove the last owner of the project"
    )
  })

  it("lanza error si MANAGER intenta eliminar a otro MANAGER", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(true)
    mockProjectMember.findUnique
      .mockResolvedValueOnce({ role: "MANAGER", userId: "user-2" }) // target
      .mockResolvedValueOnce({ role: "MANAGER" }) // caller
    mockProjectMember.count.mockResolvedValue(2)

    await expect(removeProjectMember(PROJECT_ID, "user-2")).rejects.toThrow(
      "Cannot remove a member with equal or higher role"
    )
  })

  it("lanza error si no tiene acceso", async () => {
    mockRequireAuth.mockResolvedValue(AUTH_OK)
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(removeProjectMember(PROJECT_ID, "user-2")).rejects.toThrow("Forbidden")
  })
})

describe("getUsersWithProjectAccess", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve usuarios con acceso excluyendo miembros existentes", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockUser.findMany.mockResolvedValue([
      { id: "user-1", name: "A", email: "a@a.com", image: null, username: "a" },
      { id: "user-2", name: "B", email: "b@b.com", image: null, username: "b" },
    ])
    mockProjectMember.findMany.mockResolvedValue([{ userId: "user-1" }])

    const result = await getUsersWithProjectAccess(PROJECT_ID)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("user-2")
  })

  it("lanza error si no tiene acceso MANAGER", async () => {
    mockHasProjectAccess.mockResolvedValue(false)

    await expect(getUsersWithProjectAccess(PROJECT_ID)).rejects.toThrow("Forbidden")
  })

  it("lanza error si prisma falla", async () => {
    mockHasProjectAccess.mockResolvedValue(true)
    mockUser.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getUsersWithProjectAccess(PROJECT_ID)).rejects.toThrow("DB error")
  })
})
