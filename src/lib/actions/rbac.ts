'use server'

/**
 * RBAC (Role-Based Access Control) utilities
 * Use these helpers to verify permissions in server actions
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCachedRoles } from './cached-queries'

export type Resource = 'projects' | 'tasks' | 'users' | 'roles' | 'sentiment' | 'departments' | 'ai' | 'admin'
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
}

interface AuthError {
  authenticated: false
  error: string
}

type AuthCheck = AuthResult | AuthError

/**
 * Check if user is authenticated
 * Returns user info or error
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
      role: { select: { name: true } }
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
  }
}

/**
 * Check if user has permission for resource/action
 */
export async function hasPermission(
  resource: Resource, 
  action: Action
): Promise<boolean> {
  const authCheck = await requireAuth()
  
  if (!authCheck.authenticated) {
    return false
  }
  
  // Admin / Super Admin bypass
  if (authCheck.roleName === 'Admin' || authCheck.roleName === 'Super Admin') {
    return true
  }
  
  const roles = await getCachedRoles()
  const userRole = roles.find(r => r.id === authCheck.roleId)
  
  if (!userRole) {
    return false
  }
  
  // Check if role has specific permission or 'manage' (all actions)
  return userRole.permissions.some(p => 
    p.resource === resource && 
    (p.action === action || p.action === 'manage')
  )
}

/**
 * Require permission or throw
 */
export async function requirePermission(
  resource: Resource, 
  action: Action
): Promise<AuthResult> {
  const authCheck = await requireAuth()
  
  if (!authCheck.authenticated) {
    throw new Error(authCheck.error)
  }
  
  const allowed = await hasPermission(resource, action)
  
  if (!allowed) {
    throw new Error(`Forbidden: You don't have permission to ${action} ${resource}`)
  }
  
  return authCheck
}

/**
 * Get current user ID (quick check)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession() as { user?: SessionUser } | null
  return session?.user?.id ?? null
}

