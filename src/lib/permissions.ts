export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'manage'
export type PermissionResource = 'admin' | 'users' | 'roles' | 'projects' | 'settings' | 'departments' | 'sentiment' | 'tasks' | 'lists' | 'comments' | 'attachments' | 'tags'

export interface UserPermission {
  action: string
  resource: string
}

export interface UserSession {
  user: {
    id: string
    username: string
    name: string | null
    role: string
    permissions: string[] // Format: "action:resource"
  }
}

/**
 * Checks if a user has a specific permission.
 * Usage: hasPermission(user, 'view', 'admin')
 */
export function hasPermission(
  user: UserSession['user'] | null | undefined, 
  action: PermissionAction, 
  resource: PermissionResource
): boolean {
  if (!user || !user.permissions) return false

  const permissionString = `${action}:${resource}`
  
  // Check for exact match
  if (user.permissions.includes(permissionString)) return true
  
  // Check for 'manage' action which implies everything for that resource
  if (action !== 'manage' && user.permissions.includes(`manage:${resource}`)) return true

  // Specific check for Super Admin if needed (optional, but implemented via permissions usually)
  // For now, reliance on explicit permissions is safer/cleaner.

  return false
}

/**
 * Checks if a user has ANY of the provided permissions.
 */
export function hasAnyPermission(
  user: UserSession['user'] | null | undefined, 
  permissions: { action: PermissionAction, resource: PermissionResource }[]
): boolean {
  return permissions.some(p => hasPermission(user, p.action, p.resource))
}
