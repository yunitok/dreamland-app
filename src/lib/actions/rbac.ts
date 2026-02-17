'use server'

/**
 * RBAC (Role-Based Access Control) utilities
 * Todas las verificaciones consultan la DB en vivo (no dependen del JWT).
 * Para checks rápidos en el cliente (UI condicional), usar src/lib/permissions.ts.
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProjectRole } from '@prisma/client'

export type Resource = 'projects' | 'tasks' | 'users' | 'roles' | 'sentiment' | 'departments' | 'ai' | 'admin' | 'sherlock' | 'reports' | 'settings' | 'lists' | 'comments' | 'attachments' | 'tags'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage'

// Session user type (from auth.ts)
interface SessionUser {
  id: string
  username: string
  name: string | null
  role: string
  permissions: string[]
}

interface AuthResult {
  authenticated: true
  userId: string
  roleId: string
  roleName: string
  roleCode: string
}

interface AuthError {
  authenticated: false
  error: string
}

type AuthCheck = AuthResult | AuthError

// Jerarquía de roles de proyecto (de mayor a menor privilegio)
const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  EDITOR: 2,
  VIEWER: 1,
}

/**
 * Check if user is authenticated (consulta DB en vivo)
 */
export async function requireAuth(): Promise<AuthCheck> {
  const session = await getSession() as { user?: SessionUser } | null

  if (!session?.user?.id) {
    return { authenticated: false, error: 'Unauthorized: Please log in' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      roleId: true,
      role: { select: { name: true, code: true } }
    }
  })

  if (!user) {
    return { authenticated: false, error: 'User not found' }
  }

  return {
    authenticated: true,
    userId: user.id,
    roleId: user.roleId,
    roleName: user.role.name,
    roleCode: user.role.code,
  }
}

/**
 * Check if user has permission for resource/action (consulta DB en vivo)
 */
export async function hasPermission(
  resource: Resource,
  action: Action
): Promise<boolean> {
  const authCheck = await requireAuth()

  if (!authCheck.authenticated) {
    return false
  }

  // SUPER_ADMIN bypassa todo
  if (authCheck.roleCode === 'SUPER_ADMIN') {
    return true
  }

  // Consultar permisos directamente de la DB
  const role = await prisma.role.findUnique({
    where: { id: authCheck.roleId },
    include: {
      permissions: {
        select: { action: true, resource: true }
      }
    }
  })

  if (!role) {
    return false
  }

  return role.permissions.some(p =>
    p.resource === resource &&
    (p.action === action || p.action === 'manage')
  )
}

/**
 * Require permission or throw (consulta DB en vivo)
 */
export async function requirePermission(
  resource: Resource,
  action: Action
): Promise<AuthResult> {
  const authCheck = await requireAuth()

  if (!authCheck.authenticated) {
    throw new Error(authCheck.error)
  }

  // SUPER_ADMIN bypassa todo
  if (authCheck.roleCode === 'SUPER_ADMIN') {
    return authCheck
  }

  // Consultar permisos directamente de la DB
  const role = await prisma.role.findUnique({
    where: { id: authCheck.roleId },
    include: {
      permissions: {
        select: { action: true, resource: true }
      }
    }
  })

  const allowed = role?.permissions.some(p =>
    p.resource === resource &&
    (p.action === action || p.action === 'manage')
  ) ?? false

  if (!allowed) {
    throw new Error(`Forbidden: You don't have permission to ${action} ${resource}`)
  }

  return authCheck
}

/**
 * Verifica que el usuario tenga acceso a un proyecto específico
 * con al menos el rol mínimo requerido. Redirige si no tiene acceso.
 */
export async function requireProjectAccess(
  projectId: string,
  minRole: ProjectRole = 'VIEWER'
) {
  const session = await getSession() as { user?: SessionUser } | null
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  })

  if (!user) redirect('/login')

  // SUPER_ADMIN bypassa todo
  if (user.role.code === 'SUPER_ADMIN') return

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      }
    }
  })

  if (!membership) {
    redirect('/unauthorized')
  }

  if (PROJECT_ROLE_HIERARCHY[membership.role] < PROJECT_ROLE_HIERARCHY[minRole]) {
    redirect('/unauthorized')
  }
}

/**
 * Versión no-redirect: devuelve boolean.
 * Útil para condicionales en la UI.
 */
export async function hasProjectAccess(
  projectId: string,
  minRole: ProjectRole = 'VIEWER'
): Promise<boolean> {
  const session = await getSession() as { user?: SessionUser } | null
  if (!session?.user) return false

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  })

  if (!user) return false
  if (user.role.code === 'SUPER_ADMIN') return true

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      }
    }
  })

  if (!membership) return false
  return PROJECT_ROLE_HIERARCHY[membership.role] >= PROJECT_ROLE_HIERARCHY[minRole]
}

/**
 * Devuelve solo los IDs de proyectos a los que el usuario tiene acceso.
 * SUPER_ADMIN devuelve null (significando "todos").
 */
export async function getAccessibleProjectIds(): Promise<string[] | null> {
  const session = await getSession() as { user?: SessionUser } | null
  if (!session?.user) return []

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  })

  if (!user) return []
  if (user.role.code === 'SUPER_ADMIN') return null // null = todos

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true }
  })

  return memberships.map(m => m.projectId)
}

/**
 * Get current user ID (quick check)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession() as { user?: SessionUser } | null
  return session?.user?.id ?? null
}
