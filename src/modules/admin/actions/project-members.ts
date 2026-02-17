"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { ProjectRole } from "@prisma/client"

/**
 * Obtener todas las membresías de un usuario en proyectos.
 */
export async function getUserProjectMemberships(userId: string) {
  await requirePermission("users", "read")

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        select: { id: true, title: true, department: true, status: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return { success: true, data: memberships }
}

/**
 * Obtener todos los miembros de un proyecto.
 */
export async function getProjectMembers(projectId: string) {
  await requirePermission("projects", "read")

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, username: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return { success: true, data: members }
}

/**
 * Asignar un usuario a un proyecto (o actualizar su rol si ya existe).
 */
export async function assignUserToProject(
  userId: string,
  projectId: string,
  role: ProjectRole
) {
  await requirePermission("users", "manage")

  try {
    const membership = await prisma.projectMember.upsert({
      where: {
        userId_projectId: { userId, projectId }
      },
      update: { role },
      create: { userId, projectId, role }
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { success: true, data: membership }
  } catch (error) {
    console.error("Error assigning user to project:", error)
    return { success: false, error: "Failed to assign user to project" }
  }
}

/**
 * Eliminar la membresía de un usuario en un proyecto.
 */
export async function removeUserFromProject(userId: string, projectId: string) {
  await requirePermission("users", "manage")

  try {
    await prisma.projectMember.delete({
      where: {
        userId_projectId: { userId, projectId }
      }
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { success: true }
  } catch (error) {
    console.error("Error removing user from project:", error)
    return { success: false, error: "Failed to remove user from project" }
  }
}

/**
 * Asignación masiva: dar acceso a múltiples proyectos a un usuario.
 */
export async function bulkAssignProjects(
  userId: string,
  assignments: { projectId: string; role: ProjectRole }[]
) {
  await requirePermission("users", "manage")

  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({
        where: { userId }
      })

      if (assignments.length > 0) {
        await tx.projectMember.createMany({
          data: assignments.map(a => ({
            userId,
            projectId: a.projectId,
            role: a.role
          }))
        })
      }
    })

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error in bulk assign:", error)
    return { success: false, error: "Failed to update project assignments" }
  }
}
