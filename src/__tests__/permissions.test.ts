import { describe, it, expect } from 'vitest'
import { hasPermission, UserSession } from '../lib/permissions'

describe('Access Control - hasPermission', () => {
  const mockUser: UserSession['user'] = {
    id: '1',
    username: 'test',
    name: 'Test',
    role: 'Editor',
    permissions: ['view:projects', 'manage:projects', 'view:admin'] // manage:projects implies view/update/delete projects
  }

  it('should return false if user is null', () => {
    expect(hasPermission(null, 'view', 'admin')).toBe(false)
  })

  it('should return true if user has exact permission', () => {
    expect(hasPermission(mockUser, 'view', 'projects')).toBe(true)
  })

  it('should return false if user does not have permission', () => {
    expect(hasPermission(mockUser, 'delete', 'users')).toBe(false)
  })

  it('should return true if user has "manage" permission for the resource', () => {
    // User has 'manage:projects', so 'create:projects' or 'delete:projects' should be true
    expect(hasPermission(mockUser, 'create', 'projects')).toBe(true)
    expect(hasPermission(mockUser, 'delete', 'projects')).toBe(true)
  })

  it('should return false if manage permission is for a different resource', () => {
    expect(hasPermission(mockUser, 'create', 'users')).toBe(false)
  })
})
