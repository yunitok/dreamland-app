"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"

export async function getRoles() {
  await requirePermission("roles", "read")
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
            select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, data: roles }
  } catch (error) {
    console.error("Error fetching roles:", error)
    return { success: false, error: "Failed to fetch roles" }
  }
}

interface RoleFormData {
  name: string;
  description?: string;
  permissions: string[];
}

export async function createRole(data: RoleFormData) {
  await requirePermission("roles", "manage")
  try {
    const role = await prisma.role.create({
      data: {
        code: data.name.toUpperCase().replace(/\s+/g, '_'),
        name: data.name,
        description: data.description,
        permissions: {
            connectOrCreate: data.permissions.map((p: string) => {
                const [action, resource] = p.split(':')
                return {
                    where: { action_resource: { action, resource } },
                    create: { action, resource }
                }
            })
        }
      }
    })
    revalidatePath("/admin/roles")
    return { success: true, data: role }
  } catch (error) {
    console.error("Error creating role:", error)
    return { success: false, error: "Failed to create role" }
  }
}

export async function updateRole(id: string, data: RoleFormData) {
  await requirePermission("roles", "manage")
  try {
    // 1. Clear existing permissions
    await prisma.role.update({
        where: { id },
        data: {
            permissions: {
                set: []
            }
        }
    })

    // 2. Set new permissions
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: {
            connectOrCreate: data.permissions.map((p: string) => {
                const [action, resource] = p.split(':')
                return {
                    where: { action_resource: { action, resource } },
                    create: { action, resource }
                }
            })
        }
      }
    })
    revalidatePath("/admin/roles")
    return { success: true, data: role }
  } catch (error) {
    console.error("Error updating role:", error)
    return { success: false, error: "Failed to update role" }
  }
}

export async function deleteRole(id: string) {
  await requirePermission("roles", "manage")
  try {
    // Prevent deleting system roles
    const role = await prisma.role.findUnique({ where: { id } })
    if (role?.isSystem) {
        return { success: false, error: "Cannot delete system roles" }
    }

    await prisma.role.delete({
      where: { id }
    })
    revalidatePath("/admin/roles")
    return { success: true }
  } catch (error) {
    console.error("Error deleting role:", error)
    // Check for foreign key constraints (users assigned to this role)
    if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
        return { success: false, error: "Cannot delete role because it is assigned to users" }
    }
    return { success: false, error: "Failed to delete role" }
  }
}
