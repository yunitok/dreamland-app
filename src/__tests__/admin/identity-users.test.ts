import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockHash = vi.hoisted(() => vi.fn())

const mockPrismaUser = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("bcryptjs", () => ({ hash: mockHash }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: mockPrismaUser } }))

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/modules/admin/actions/identity-users"

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const HASHED_PASSWORD = "hashed_password_abc123"

const mockUser = {
  id: "user-1",
  name: "Ana García",
  username: "ana.garcia",
  email: "ana@example.com",
  password: HASHED_PASSWORD,
  roleId: "role-1",
  image: null,
  createdAt: new Date("2026-01-01"),
  role: { id: "role-1", name: "Admin" },
}

const baseFormData = {
  name: "Ana García",
  username: "ana.garcia",
  email: "ana@example.com",
  password: "secretpass",
  roleId: "role-1",
  image: undefined,
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
  mockHash.mockResolvedValue(HASHED_PASSWORD)
})

// ─── getUsers ─────────────────────────────────────────────────────────────────

describe("getUsers", () => {
  it("requiere permiso read:users", async () => {
    mockPrismaUser.findMany.mockResolvedValue([])
    await getUsers()
    expect(mockRequirePermission).toHaveBeenCalledWith("users", "read")
  })

  it("devuelve {success: true, data: users} cuando findMany tiene éxito", async () => {
    const users = [mockUser]
    mockPrismaUser.findMany.mockResolvedValue(users)

    const result = await getUsers()

    expect(result).toEqual({ success: true, data: users })
    expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
      include: { role: true },
      orderBy: { createdAt: "desc" },
    })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaUser.findMany.mockRejectedValue(new Error("DB connection error"))

    const result = await getUsers()

    expect(result).toEqual({ success: false, error: "Failed to fetch users" })
  })
})

// ─── createUser ───────────────────────────────────────────────────────────────

describe("createUser", () => {
  it("requiere permiso manage:users", async () => {
    mockPrismaUser.create.mockResolvedValue(mockUser)
    await createUser(baseFormData)
    expect(mockRequirePermission).toHaveBeenCalledWith("users", "manage")
  })

  it("llama hash() con el password y SALT_ROUNDS=10", async () => {
    mockPrismaUser.create.mockResolvedValue(mockUser)

    await createUser(baseFormData)

    expect(mockHash).toHaveBeenCalledWith("secretpass", 10)
  })

  it("llama prisma.user.create() con datos correctos incluyendo password hasheado", async () => {
    mockPrismaUser.create.mockResolvedValue(mockUser)

    await createUser(baseFormData)

    expect(mockPrismaUser.create).toHaveBeenCalledWith({
      data: {
        name: "Ana García",
        username: "ana.garcia",
        email: "ana@example.com",
        password: HASHED_PASSWORD,
        roleId: "role-1",
        image: undefined,
      },
    })
  })

  it("llama revalidatePath('/admin/users')", async () => {
    mockPrismaUser.create.mockResolvedValue(mockUser)

    await createUser(baseFormData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("retorna {success: true, data: user}", async () => {
    mockPrismaUser.create.mockResolvedValue(mockUser)

    const result = await createUser(baseFormData)

    expect(result).toEqual({ success: true, data: mockUser })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaUser.create.mockRejectedValue(new Error("Unique constraint failed"))

    const result = await createUser(baseFormData)

    expect(result).toEqual({ success: false, error: "Failed to create user" })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ─── updateUser ───────────────────────────────────────────────────────────────

describe("updateUser", () => {
  const USER_ID = "user-1"

  it("requiere permiso manage:users", async () => {
    mockPrismaUser.update.mockResolvedValue(mockUser)
    await updateUser(USER_ID, baseFormData)
    expect(mockRequirePermission).toHaveBeenCalledWith("users", "manage")
  })

  it("sin password: update NO llama a hash()", async () => {
    const dataWithoutPassword = { ...baseFormData, password: undefined }
    mockPrismaUser.update.mockResolvedValue(mockUser)

    await updateUser(USER_ID, dataWithoutPassword)

    expect(mockHash).not.toHaveBeenCalled()
  })

  it("sin password: update NO incluye campo password en updateData", async () => {
    const dataWithoutPassword = { ...baseFormData, password: undefined }
    mockPrismaUser.update.mockResolvedValue(mockUser)

    await updateUser(USER_ID, dataWithoutPassword)

    expect(mockPrismaUser.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: expect.not.objectContaining({ password: expect.anything() }),
    })
  })

  it("con password: update SÍ llama a hash() e incluye password en updateData", async () => {
    mockPrismaUser.update.mockResolvedValue(mockUser)

    await updateUser(USER_ID, baseFormData)

    expect(mockHash).toHaveBeenCalledWith("secretpass", 10)
    expect(mockPrismaUser.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: expect.objectContaining({ password: HASHED_PASSWORD }),
    })
  })

  it("llama prisma.user.update() con where:{id}", async () => {
    mockPrismaUser.update.mockResolvedValue(mockUser)

    await updateUser(USER_ID, baseFormData)

    expect(mockPrismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID } })
    )
  })

  it("llama revalidatePath('/admin/users')", async () => {
    mockPrismaUser.update.mockResolvedValue(mockUser)

    await updateUser(USER_ID, baseFormData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("retorna {success: true, data: user}", async () => {
    mockPrismaUser.update.mockResolvedValue(mockUser)

    const result = await updateUser(USER_ID, baseFormData)

    expect(result).toEqual({ success: true, data: mockUser })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaUser.update.mockRejectedValue(new Error("Record not found"))

    const result = await updateUser(USER_ID, baseFormData)

    expect(result).toEqual({ success: false, error: "Failed to update user" })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe("deleteUser", () => {
  const USER_ID = "user-1"

  it("requiere permiso manage:users", async () => {
    mockPrismaUser.delete.mockResolvedValue(mockUser)
    await deleteUser(USER_ID)
    expect(mockRequirePermission).toHaveBeenCalledWith("users", "manage")
  })

  it("llama prisma.user.delete() con where:{id}", async () => {
    mockPrismaUser.delete.mockResolvedValue(mockUser)

    await deleteUser(USER_ID)

    expect(mockPrismaUser.delete).toHaveBeenCalledWith({ where: { id: USER_ID } })
  })

  it("llama revalidatePath('/admin/users')", async () => {
    mockPrismaUser.delete.mockResolvedValue(mockUser)

    await deleteUser(USER_ID)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("retorna {success: true}", async () => {
    mockPrismaUser.delete.mockResolvedValue(mockUser)

    const result = await deleteUser(USER_ID)

    expect(result).toEqual({ success: true })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaUser.delete.mockRejectedValue(new Error("Foreign key constraint"))

    const result = await deleteUser(USER_ID)

    expect(result).toEqual({ success: false, error: "Failed to delete user" })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
