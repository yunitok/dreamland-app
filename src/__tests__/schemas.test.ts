import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  createProjectSchema,
  createListSchema,
  cuidSchema,
} from '@/lib/validations/schemas'

describe('Zod Validation Schemas', () => {
  describe('cuidSchema', () => {
    it('should validate valid CUID', () => {
      const result = cuidSchema.safeParse('clxyz123456789abcdefgh')
      expect(result.success).toBe(true)
    })

    it('should reject empty string', () => {
      const result = cuidSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })

  describe('createTaskSchema', () => {
    it('should validate valid task', () => {
      const validTask = {
        title: 'Test Task',
        listId: 'clxyz123456789abcdefgh',
        statusId: 'clxyz123456789abcdefgi',
      }
      
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })

    it('should reject task without title', () => {
      const invalidTask = {
        listId: 'clxyz123456789abcdefgh',
        statusId: 'clxyz123456789abcdefgi',
      }
      
      const result = createTaskSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
    })

    it('should reject title too long', () => {
      const invalidTask = {
        title: 'a'.repeat(201), // Max 200
        listId: 'clxyz123456789abcdefgh',
        statusId: 'clxyz123456789abcdefgi',
      }
      
      const result = createTaskSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
    })

    it('should validate optional fields', () => {
      const validTask = {
        title: 'Test Task',
        description: 'A description',
        listId: 'clxyz123456789abcdefgh',
        statusId: 'clxyz123456789abcdefgi',
        estimatedHours: 8,
        storyPoints: 5,
      }
      
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })
  })

  describe('createProjectSchema', () => {
    it('should validate valid project', () => {
      const validProject = {
        title: 'Test Project',
        description: 'A test project description',
        department: 'Engineering',
        priority: 'Medium',
        type: 'Idea',
        status: 'Pending',
      }
      
      const result = createProjectSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should reject invalid project type', () => {
      const invalidProject = {
        title: 'Test Project',
        department: 'Engineering',
        type: 'InvalidType',
      }
      
      const result = createProjectSchema.safeParse(invalidProject)
      expect(result.success).toBe(false)
    })
  })
})

