/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTaskList, updateTaskList, deleteTaskList, getTaskLists } from '@/modules/projects/actions/task-lists'
import { prisma } from '@/lib/prisma'

// Mock @/lib/actions/rbac
vi.mock('@/lib/actions/rbac', () => ({
  hasProjectAccess: vi.fn().mockResolvedValue(true),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    taskList: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}))

describe('Task List Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTaskLists', () => {
    it('returns lists ordered by position', async () => {
        vi.mocked(prisma.taskList.findMany).mockResolvedValue([
            { id: 'l1', name: 'Todo', position: 0 },
            { id: 'l2', name: 'Doing', position: 1 }
        ] as any)

        const lists = await getTaskLists('proj_1')
        expect(lists).toHaveLength(2)
        expect(prisma.taskList.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { projectId: 'proj_1' },
            orderBy: { position: 'asc' }
        }))
    })
  })

  describe('createTaskList', () => {
    it('creates a list with correct position', async () => {
        // Mock aggregate for position
        vi.mocked(prisma.taskList.aggregate).mockResolvedValue({
            _max: { position: 1 }
        } as any)
        
        vi.mocked(prisma.taskList.create).mockResolvedValue({
            id: 'l3',
            name: 'Done',
            position: 2,
            projectId: 'proj_1'
        } as any)

        const list = await createTaskList({ projectId: 'proj_1', name: 'Done' })
        
        expect(prisma.taskList.aggregate).toHaveBeenCalledWith({
            where: { projectId: 'proj_1' },
            _max: { position: true }
        })

        expect(prisma.taskList.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                name: 'Done',
                projectId: 'proj_1',
                position: 2
            })
        }))
        expect(list.id).toBe('l3')
    })
  })

  describe('updateTaskList', () => {
    it('updates list name', async () => {
        vi.mocked(prisma.taskList.findUnique).mockResolvedValue({
            projectId: 'proj_1'
        } as any)

        vi.mocked(prisma.taskList.update).mockResolvedValue({
            id: 'l1',
            name: 'New Name',
            project: { id: 'proj_1' }
        } as any)

        await updateTaskList('l1', { name: 'New Name' })
        
        expect(prisma.taskList.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'l1' },
            data: { name: 'New Name' }
        }))
    })
  })

  describe('deleteTaskList', () => {
    it('deletes a list', async () => {
        vi.mocked(prisma.taskList.findUnique).mockResolvedValue({
            projectId: 'proj_1',
            _count: { tasks: 0 }
        } as any)

        vi.mocked(prisma.taskList.delete).mockResolvedValue({ id: 'l1' } as any)
        
        await deleteTaskList('l1')
        
        expect(prisma.taskList.findUnique).toHaveBeenCalledWith({
            where: { id: 'l1' },
            select: { projectId: true, _count: { select: { tasks: true } } }
        })

        expect(prisma.taskList.delete).toHaveBeenCalledWith({
            where: { id: 'l1' }
        })
    })

    it('throws if list has tasks', async () => {
        vi.mocked(prisma.taskList.findUnique).mockResolvedValue({
            projectId: 'proj_1',
            _count: { tasks: 5 }
        } as any)

        await expect(deleteTaskList('l1')).rejects.toThrow('Cannot delete a list with tasks')
        
        expect(prisma.taskList.delete).not.toHaveBeenCalled()
    })
  })
})
