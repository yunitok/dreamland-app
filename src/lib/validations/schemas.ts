/**
 * Zod validation schemas for Dreamland Manager
 * Provides runtime type validation for server actions
 */
import { z } from 'zod'

// =============================================================================
// BASE VALIDATORS
// =============================================================================

/** CUID format validator */
export const cuidSchema = z.string().cuid()

/** Optional CUID that can be null */
export const optionalCuidSchema = z.string().cuid().optional().nullable()

// =============================================================================
// TASK SCHEMAS
// =============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000).optional(),
  technicalNotes: z.string().max(10000).optional(),
  listId: cuidSchema,
  statusId: cuidSchema,
  parentId: cuidSchema.optional(),
  assigneeId: cuidSchema.optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  tagIds: z.array(cuidSchema).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  technicalNotes: z.string().max(10000).optional().nullable(),
  listId: cuidSchema.optional(),
  statusId: cuidSchema.optional(),
  assigneeId: optionalCuidSchema,
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedHours: z.number().min(0).max(1000).optional().nullable(),
  actualHours: z.number().min(0).max(10000).optional().nullable(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
  position: z.number().int().min(0).optional(),
  tagIds: z.array(cuidSchema).optional(),
})

export const moveTaskSchema = z.object({
  taskId: cuidSchema,
  targetListId: cuidSchema,
  targetPosition: z.number().int().min(0),
})

export const reorderTasksSchema = z.object({
  listId: cuidSchema,
  taskIds: z.array(cuidSchema).min(1),
})

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const projectFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  department: z.string().max(50).optional(),
  priority: z.enum(['all', 'High', 'Medium', 'Low']).optional(),
  type: z.enum(['all', 'Problem', 'Idea', 'Initiative']).optional(),
  status: z.enum(['all', 'Active', 'Pending', 'Done']).optional(),
})

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  department: z.string().min(1).max(100),
  priority: z.enum(['High', 'Medium', 'Low']),
  type: z.enum(['Problem', 'Idea', 'Initiative']),
  status: z.enum(['Active', 'Pending', 'Done']).default('Pending'),
  sourceQuote: z.string().max(1000).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  roleId: cuidSchema,
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  roleId: cuidSchema.optional(),
  image: z.string().url().optional().nullable(),
})

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// =============================================================================
// TASK LIST SCHEMAS
// =============================================================================

export const createListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  projectId: cuidSchema,
})

export const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  position: z.number().int().min(0).optional(),
})

// =============================================================================
// COMMENT & ATTACHMENT SCHEMAS
// =============================================================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  taskId: cuidSchema,
})

export const createAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  filepath: z.string().min(1),
  filesize: z.number().int().min(0).max(100_000_000), // 100MB max
  mimetype: z.string().min(1).max(100),
  taskId: cuidSchema,
})

// =============================================================================
// TAG SCHEMAS
// =============================================================================

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  projectId: cuidSchema,
})

// =============================================================================
// SENTIMENT SCHEMAS
// =============================================================================

export const createSentimentSchema = z.object({
  departmentName: z.string().min(1).max(100),
  sentimentScore: z.number().int().min(0).max(100),
  dominantEmotion: z.string().min(1).max(100),
  keyConcerns: z.string().max(1000).optional(),
})

// =============================================================================
// DEPENDENCY SCHEMAS
// =============================================================================

export const addDependencySchema = z.object({
  predecessorId: cuidSchema,
  successorId: cuidSchema,
  type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS'),
  lagDays: z.number().int().min(-365).max(365).default(0),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type MoveTaskInput = z.infer<typeof moveTaskSchema>
export type ProjectFilters = z.infer<typeof projectFiltersSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateListInput = z.infer<typeof createListSchema>
export type UpdateListInput = z.infer<typeof updateListSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateSentimentInput = z.infer<typeof createSentimentSchema>
export type AddDependencyInput = z.infer<typeof addDependencySchema>
