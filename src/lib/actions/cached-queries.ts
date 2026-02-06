'use server'

/**
 * Cached queries using Next.js unstable_cache
 * For data that changes infrequently
 */

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Get all users for assignment dropdowns
 * Cached for 5 minutes - users don't change often
 */
export const getCachedUsers = unstable_cache(
  async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
      orderBy: { name: 'asc' }
    })
  },
  ['users-list'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['users']
  }
)

/**
 * Get all task statuses
 * Cached for 1 hour - statuses rarely change
 */
export const getCachedStatuses = unstable_cache(
  async () => {
    return prisma.taskStatus.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        position: true,
        isDefault: true,
        isClosed: true,
      },
      orderBy: { position: 'asc' }
    })
  },
  ['task-statuses'],
  { 
    revalidate: 3600, // 1 hour
    tags: ['statuses']
  }
)

/**
 * Get roles and permissions for RBAC
 * Cached for 1 hour - permissions rarely change
 */
export const getCachedRoles = unstable_cache(
  async () => {
    return prisma.role.findMany({
      include: {
        permissions: {
          select: {
            id: true,
            resource: true,
            action: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  },
  ['roles-permissions'],
  { 
    revalidate: 3600, // 1 hour
    tags: ['roles', 'permissions']
  }
)

/**
 * Get tags for a project
 * Cached for 5 minutes
 */
export const getCachedTags = unstable_cache(
  async (projectId: string) => {
    return prisma.tag.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: { name: 'asc' }
    })
  },
  ['project-tags'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['tags']
  }
)

/**
 * Get departments list (for filters)
 * Cached for 30 minutes
 */
export const getCachedDepartments = unstable_cache(
  async () => {
    const projects = await prisma.project.findMany({
      select: { department: true },
      distinct: ['department'],
    })
    return projects.map(p => p.department)
  },
  ['departments'],
  { 
    revalidate: 1800, // 30 minutes
    tags: ['departments', 'projects']
  }
)
