import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())

const mockPrismaRole = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/lib/prisma", () => ({ prisma: { role: mockPrismaRole } }))

import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "@/modules/admin/actions/identity-roles"

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const mockRole = {
  id: "role-1",
  code: "ADMIN",
  name: "Admin",
  description: "Administrador del sistema",
  isSystem: false,
  permissions: [
    { id: "perm-1", action: "read", resource: "projects" },
    { id: "perm-2", action: "manage", resource: "projects" },
  ],
  _count: { users: 3 },
}

const baseFormData = {
  name: "Admin",
  description: "Administrador del sistema",
  permissions: ["read:projects", "manage:projects"],
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
})

// ─── getRoles ─────────────────────────────────────────────────────────────────

describe("getRoles", () => {
  it("requiere permiso read:roles", async () => {
    mockPrismaRole.findMany.mockResolvedValue([])
    await getRoles()
    expect(mockRequirePermission).toHaveBeenCalledWith("roles", "read")
  })

  it("llama findMany con include correcto (permissions y _count users)", async () => {
    const roles = [mockRole]
    mockPrismaRole.findMany.mockResolvedValue(roles)

    await getRoles()

    expect(mockPrismaRole.findMany).toHaveBeenCalledWith({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    })
  })

  it("retorna {success: true, data: roles}", async () => {
    const roles = [mockRole]
    mockPrismaRole.findMany.mockResolvedValue(roles)

    const result = await getRoles()

    expect(result).toEqual({ success: true, data: roles })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaRole.findMany.mockRejectedValue(new Error("DB connection error"))

    const result = await getRoles()

    expect(result).toEqual({ success: false, error: "Failed to fetch roles" })
  })
})

// ─── createRole ───────────────────────────────────────────────────────────────

describe("createRole", () => {
  it("requiere permiso manage:roles", async () => {
    mockPrismaRole.create.mockResolvedValue(mockRole)
    await createRole(baseFormData)
    expect(mockRequirePermission).toHaveBeenCalledWith("roles", "manage")
  })

  it("genera code como name.toUpperCase().replace(spaces, '_')", async () => {
    mockPrismaRole.create.mockResolvedValue(mockRole)

    await createRole({ ...baseFormData, name: "My Role" })

    expect(mockPrismaRole.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "MY_ROLE" }),
      })
    )
  })

  it("transforma permissions 'read:projects' en { action: 'read', resource: 'projects' }", async () => {
    mockPrismaRole.create.mockResolvedValue(mockRole)

    await createRole({ name: "Test", permissions: ["read:projects", "manage:users"] })

    expect(mockPrismaRole.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        permissions: {
          connectOrCreate: [
            {
              where: { action_resource: { action: "read", resource: "projects" } },
              create: { action: "read", resource: "projects" },
            },
            {
              where: { action_resource: { action: "manage", resource: "users" } },
              create: { action: "manage", resource: "users" },
            },
          ],
        },
      }),
    })
  })

  it("llama revalidatePath('/admin/roles')", async () => {
    mockPrismaRole.create.mockResolvedValue(mockRole)

    await createRole(baseFormData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/roles")
  })

  it("retorna {success: true, data: role}", async () => {
    mockPrismaRole.create.mockResolvedValue(mockRole)

    const result = await createRole(baseFormData)

    expect(result).toEqual({ success: true, data: mockRole })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaRole.create.mockRejectedValue(new Error("Unique constraint failed"))

    const result = await createRole(baseFormData)

    expect(result).toEqual({ success: false, error: "Failed to create role" })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ─── updateRole ───────────────────────────────────────────────────────────────

describe("updateRole", () => {
  const ROLE_ID = "role-1"

  it("requiere permiso manage:roles", async () => {
    mockPrismaRole.update.mockResolvedValue(mockRole)
    await updateRole(ROLE_ID, baseFormData)
    expect(mockRequirePermission).toHaveBeenCalledWith("roles", "manage")
  })

  it("primer update limpia permisos con { permissions: { set: [] } }", async () => {
    mockPrismaRole.update.mockResolvedValue(mockRole)

    await updateRole(ROLE_ID, baseFormData)

    expect(mockPrismaRole.update).toHaveBeenNthCalledWith(1, {
      where: { id: ROLE_ID },
      data: { permissions: { set: [] } },
    })
  })

  it("segundo update actualiza name, description y nuevos permisos con connectOrCreate", async () => {
    mockPrismaRole.update.mockResolvedValue(mockRole)

    await updateRole(ROLE_ID, baseFormData)

    expect(mockPrismaRole.update).toHaveBeenNthCalledWith(2, {
      where: { id: ROLE_ID },
      data: {
        name: baseFormData.name,
        description: baseFormData.description,
        permissions: {
          connectOrCreate: [
            {
              where: { action_resource: { action: "read", resource: "projects" } },
              create: { action: "read", resource: "projects" },
            },
            {
              where: { action_resource: { action: "manage", resource: "projects" } },
              create: { action: "manage", resource: "projects" },
            },
          ],
        },
      },
    })
  })

  it("llama prisma.role.update exactamente 2 veces", async () => {
    mockPrismaRole.update.mockResolvedValue(mockRole)

    await updateRole(ROLE_ID, baseFormData)

    expect(mockPrismaRole.update).toHaveBeenCalledTimes(2)
  })

  it("llama revalidatePath('/admin/roles')", async () => {
    mockPrismaRole.update.mockResolvedValue(mockRole)

    await updateRole(ROLE_ID, baseFormData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/roles")
  })

  it("retorna {success: true, data: role}", async () => {
    mockPrismaRole.update.mockResolvedValue(mockRole)

    const result = await updateRole(ROLE_ID, baseFormData)

    expect(result).toEqual({ success: true, data: mockRole })
  })

  it("devuelve {success: false} cuando hay error de DB", async () => {
    mockPrismaRole.update.mockRejectedValue(new Error("Record not found"))

    const result = await updateRole(ROLE_ID, baseFormData)

    expect(result).toEqual({ success: false, error: "Failed to update role" })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ─── deleteRole ───────────────────────────────────────────────────────────────

describe("deleteRole", () => {
  const ROLE_ID = "role-1"

  it("requiere permiso manage:roles", async () => {
    mockPrismaRole.findUnique.mockResolvedValue({ ...mockRole, isSystem: false })
    mockPrismaRole.delete.mockResolvedValue(mockRole)
    await deleteRole(ROLE_ID)
    expect(mockRequirePermission).toHaveBeenCalledWith("roles", "manage")
  })

  it("role.isSystem === true: retorna error sin llamar delete", async () => {
    mockPrismaRole.findUnique.mockResolvedValue({ ...mockRole, isSystem: true })

    const result = await deleteRole(ROLE_ID)

    expect(result).toEqual({ success: false, error: "Cannot delete system roles" })
    expect(mockPrismaRole.delete).not.toHaveBeenCalled()
  })

  it("role.isSystem === false: llama delete y retorna {success: true}", async () => {
    mockPrismaRole.findUnique.mockResolvedValue({ ...mockRole, isSystem: false })
    mockPrismaRole.delete.mockResolvedValue(mockRole)

    const result = await deleteRole(ROLE_ID)

    expect(mockPrismaRole.delete).toHaveBeenCalledWith({ where: { id: ROLE_ID } })
    expect(result).toEqual({ success: true })
  })

  it("findUnique retorna null: llama delete (isSystem es falsy)", async () => {
    mockPrismaRole.findUnique.mockResolvedValue(null)
    mockPrismaRole.delete.mockResolvedValue(mockRole)

    const result = await deleteRole(ROLE_ID)

    expect(mockPrismaRole.delete).toHaveBeenCalledWith({ where: { id: ROLE_ID } })
    expect(result).toEqual({ success: true })
  })

  it("llama revalidatePath('/admin/roles') tras delete exitoso", async () => {
    mockPrismaRole.findUnique.mockResolvedValue({ ...mockRole, isSystem: false })
    mockPrismaRole.delete.mockResolvedValue(mockRole)

    await deleteRole(ROLE_ID)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/roles")
  })

  it("error con 'Foreign key constraint failed': retorna mensaje específico", async () => {
    mockPrismaRole.findUnique.mockResolvedValue({ ...mockRole, isSystem: false })
    mockPrismaRole.delete.mockRejectedValue(
      new Error("Foreign key constraint failed on the field: `userId`")
    )

    const result = await deleteRole(ROLE_ID)

    expect(result).toEqual({
      success: false,
      error: "Cannot delete role because it is assigned to users",
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("otro error genérico: retorna {success: false, error: 'Failed to delete role'}", async () => {
    mockPrismaRole.findUnique.mockResolvedValue({ ...mockRole, isSystem: false })
    mockPrismaRole.delete.mockRejectedValue(new Error("Unexpected DB error"))

    const result = await deleteRole(ROLE_ID)

    expect(result).toEqual({ success: false, error: "Failed to delete role" })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
