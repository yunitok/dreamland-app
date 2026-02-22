'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hasProjectAccess, requireAuth } from '@/lib/actions/rbac'
import { ProjectRole } from '@prisma/client'
import { createNotification } from '@/lib/notification-service'

// Jerarquía local para validaciones de escalado de rol
const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  EDITOR: 2,
  VIEWER: 1,
}

/**
 * Obtener todos los miembros de un proyecto.
 * Requiere ser al menos VIEWER del proyecto.
 */
export async function getProjectMembers(projectId: string) {
  if (!await hasProjectAccess(projectId, 'VIEWER')) throw new Error('Forbidden')

  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, username: true }
      }
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' }
    ]
  })
}

/**
 * Añadir un usuario al proyecto.
 * Requiere ser MANAGER o OWNER. No se puede asignar un rol superior al propio.
 */
export async function addProjectMember(projectId: string, userId: string, role: ProjectRole) {
  const auth = await requireAuth()
  if (!auth.authenticated) throw new Error(auth.error)

  if (!await hasProjectAccess(projectId, 'MANAGER')) throw new Error('Forbidden')

  // No se puede asignar un rol que el solicitante no tiene o superior
  const callerMembership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: auth.userId, projectId } }
  })

  // SUPER_ADMIN no tiene membership pero puede hacerlo todo
  if (callerMembership && ROLE_HIERARCHY[role] > ROLE_HIERARCHY[callerMembership.role]) {
    throw new Error('Cannot assign a role higher than your own')
  }

  const membership = await prisma.projectMember.upsert({
    where: { userId_projectId: { userId, projectId } },
    update: { role },
    create: { userId, projectId, role }
  })

  revalidatePath(`/projects/${projectId}`)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true },
  })
  await createNotification({
    userId,
    type: "PROJECT_MEMBER_ADDED",
    title: "Añadido a un proyecto",
    body: `Has sido añadido al proyecto "${project?.title ?? projectId}"`,
    href: `/projects/${projectId}`,
    metadata: { projectId, role },
  })

  return membership
}

/**
 * Cambiar el rol de un miembro existente.
 * Requiere MANAGER. No se puede escalar por encima del propio rol.
 */
export async function updateProjectMember(projectId: string, userId: string, role: ProjectRole) {
  return addProjectMember(projectId, userId, role)
}

/**
 * Eliminar un miembro del proyecto.
 * OWNER puede eliminar a cualquiera. MANAGER solo puede eliminar EDITOR/VIEWER.
 * No se puede eliminar al último OWNER.
 */
export async function removeProjectMember(projectId: string, userId: string) {
  const auth = await requireAuth()
  if (!auth.authenticated) throw new Error(auth.error)

  if (!await hasProjectAccess(projectId, 'MANAGER')) throw new Error('Forbidden')

  const target = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } }
  })

  if (!target) throw new Error('Member not found')

  // Proteger al último OWNER
  if (target.role === 'OWNER') {
    const ownerCount = await prisma.projectMember.count({
      where: { projectId, role: 'OWNER' }
    })
    if (ownerCount <= 1) throw new Error('Cannot remove the last owner of the project')
  }

  // MANAGER no puede eliminar a otro MANAGER u OWNER
  const callerMembership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: auth.userId, projectId } }
  })
  if (callerMembership && ROLE_HIERARCHY[target.role] >= ROLE_HIERARCHY[callerMembership.role] && auth.userId !== userId) {
    throw new Error('Cannot remove a member with equal or higher role')
  }

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId, projectId } }
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

/**
 * Obtener lista de usuarios que tienen acceso al módulo Projects
 * (tienen el permiso projects:read en su rol global).
 * Útil para el selector de "añadir miembro".
 */
export async function getUsersWithProjectAccess(projectId: string) {
  if (!await hasProjectAccess(projectId, 'MANAGER')) throw new Error('Forbidden')

  // Obtener usuarios cuyos roles tienen el permiso projects:read
  const users = await prisma.user.findMany({
    where: {
      role: {
        permissions: {
          some: {
            resource: 'projects',
            action: { in: ['read', 'manage'] }
          }
        }
      }
    },
    select: { id: true, name: true, email: true, image: true, username: true }
  })

  // Excluir los que ya son miembros
  const existing = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true }
  })
  const existingIds = new Set(existing.map(m => m.userId))

  return users.filter(u => !existingIds.has(u.id))
}
