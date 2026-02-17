'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hasProjectAccess } from '@/lib/actions/rbac'

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTaskInput {
  title: string
  description?: string
  technicalNotes?: string
  listId: string
  statusId: string
  parentId?: string
  assigneeId?: string
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  storyPoints?: number
  tagIds?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  technicalNotes?: string
  listId?: string
  statusId?: string
  assigneeId?: string | null
  startDate?: Date | null
  dueDate?: Date | null
  estimatedHours?: number | null
  actualHours?: number | null
  storyPoints?: number | null
  progress?: number
  position?: number
  tagIds?: string[]
}

// =============================================================================
// TASK CRUD
// =============================================================================

export async function getTasks(projectId: string) {
  if (!await hasProjectAccess(projectId, 'VIEWER')) throw new Error('Forbidden')

  return prisma.task.findMany({
    where: {
      list: { projectId },
      parentId: null,
    },
    include: {
      status: true,
      assignee: { select: { id: true, name: true, image: true } },
      list: { select: { id: true, name: true, color: true } },
      tags: true,
      subtasks: {
        include: {
          status: true,
          assignee: { select: { id: true, name: true, image: true } },
        }
      },
      predecessors: {
        include: {
          predecessor: { select: { id: true, title: true } }
        }
      },
      successors: {
        include: {
          successor: { select: { id: true, title: true } }
        }
      },
      _count: {
        select: { comments: true, attachments: true, subtasks: true }
      }
    },
    orderBy: [
      { list: { position: 'asc' } },
      { position: 'asc' }
    ]
  })
}

export async function getTasksByList(listId: string) {
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    select: { projectId: true }
  })
  if (!list) return []
  if (!await hasProjectAccess(list.projectId, 'VIEWER')) throw new Error('Forbidden')

  return prisma.task.findMany({
    where: {
      listId,
      parentId: null,
    },
    include: {
      status: true,
      assignee: { select: { id: true, name: true, image: true } },
      tags: true,
      subtasks: {
        include: { status: true }
      },
      _count: {
        select: { comments: true, attachments: true, subtasks: true }
      }
    },
    orderBy: { position: 'asc' }
  })
}

export async function getTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      status: true,
      assignee: { select: { id: true, name: true, image: true, email: true } },
      list: {
        select: {
          id: true,
          name: true,
          color: true,
          project: { select: { id: true, title: true } }
        }
      },
      tags: true,
      subtasks: {
        include: {
          status: true,
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: { position: 'asc' }
      },
      parent: { select: { id: true, title: true } },
      predecessors: {
        include: {
          predecessor: {
            select: {
              id: true,
              title: true,
              status: { select: { name: true, color: true } }
            }
          }
        }
      },
      successors: {
        include: {
          successor: {
            select: {
              id: true,
              title: true,
              status: { select: { name: true, color: true } }
            }
          }
        }
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, image: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
      attachments: {
        include: {
          uploader: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!task) return null
  if (!await hasProjectAccess(task.list.project.id, 'VIEWER')) throw new Error('Forbidden')
  return task
}

export async function createTask(data: CreateTaskInput) {
  const list = await prisma.taskList.findUnique({
    where: { id: data.listId },
    select: { projectId: true }
  })
  if (!list) throw new Error('List not found')
  if (!await hasProjectAccess(list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const maxPosition = await prisma.task.aggregate({
    where: {
      listId: data.listId,
      parentId: data.parentId || null
    },
    _max: { position: true }
  })

  const newPosition = (maxPosition._max.position ?? -1) + 1

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      technicalNotes: data.technicalNotes,
      listId: data.listId,
      statusId: data.statusId,
      parentId: data.parentId,
      assigneeId: data.assigneeId,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      storyPoints: data.storyPoints,
      position: newPosition,
      tags: data.tagIds ? { connect: data.tagIds.map(id => ({ id })) } : undefined,
    },
    include: {
      status: true,
      assignee: { select: { id: true, name: true, image: true } },
      list: { select: { id: true, name: true, projectId: true } },
      tags: true,
    }
  })

  if (task.list) {
    revalidatePath(`/projects/${task.list.projectId}`)
  }
  return task
}

export async function updateTask(id: string, data: UpdateTaskInput) {
  const currentTask = await prisma.task.findUnique({
    where: { id },
    include: {
      status: true,
      list: { select: { projectId: true } }
    }
  })

  if (!currentTask) throw new Error('Task not found')
  if (!await hasProjectAccess(currentTask.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const finalAssigneeId = data.assigneeId !== undefined ? data.assigneeId : currentTask.assigneeId

  if (data.statusId) {
    const targetStatus = await prisma.taskStatus.findUnique({ where: { id: data.statusId } })

    if (targetStatus && !finalAssigneeId && targetStatus.name !== 'Backlog') {
      throw new Error('Tasks must have an assignee before moving out of Backlog')
    }
  }

  if (data.assigneeId === null && currentTask.status.name !== 'Backlog') {
    throw new Error('Cannot remove assignee from tasks outside of Backlog. Move to Backlog first.')
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      technicalNotes: data.technicalNotes,
      listId: data.listId,
      statusId: data.statusId,
      assigneeId: data.assigneeId,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      storyPoints: data.storyPoints,
      progress: data.progress,
      position: data.position,
      tags: data.tagIds ? { set: data.tagIds.map(id => ({ id })) } : undefined,
    },
    include: {
      status: true,
      list: { select: { projectId: true } },
    }
  })

  if (task.list) {
    revalidatePath(`/projects/${task.list.projectId}`)
  }
  return task
}

export async function deleteTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { list: { select: { projectId: true } } }
  })

  if (!task) throw new Error('Task not found')
  if (!await hasProjectAccess(task.list.projectId, 'MANAGER')) throw new Error('Forbidden')

  await prisma.task.delete({ where: { id } })

  revalidatePath(`/projects/${task.list.projectId}`)
  return { success: true }
}

export async function deleteTasks(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const task = await prisma.task.findUnique({
    where: { id: ids[0] },
    select: { list: { select: { projectId: true } } }
  })

  if (task?.list?.projectId) {
    if (!await hasProjectAccess(task.list.projectId, 'MANAGER')) throw new Error('Forbidden')
  }

  const result = await prisma.task.deleteMany({
    where: { id: { in: ids } }
  })

  if (task?.list?.projectId) {
    revalidatePath(`/projects/${task.list.projectId}`)
  }

  return { success: true, count: result.count }
}

// =============================================================================
// TASK MOVEMENT & REORDERING
// =============================================================================

export async function moveTask(taskId: string, targetListId: string, targetPosition: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { select: { projectId: true } } }
  })

  if (!task) throw new Error('Task not found')
  if (!await hasProjectAccess(task.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  await prisma.task.updateMany({
    where: {
      listId: targetListId,
      position: { gte: targetPosition },
      parentId: null,
    },
    data: { position: { increment: 1 } }
  })

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      listId: targetListId,
      position: targetPosition,
    }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return updatedTask
}

export async function updateTaskStatus(taskId: string, statusId: string) {
  const currentTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      status: true,
      list: { select: { projectId: true } }
    }
  })

  if (!currentTask) throw new Error('Task not found')
  if (!await hasProjectAccess(currentTask.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const targetStatus = await prisma.taskStatus.findUnique({
    where: { id: statusId }
  })

  if (!targetStatus) throw new Error('Target status not found')

  if (!currentTask.assigneeId && targetStatus.name !== 'Backlog') {
    throw new Error('Tasks must have an assignee before moving out of Backlog')
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { statusId },
    include: {
      status: true,
      list: { select: { projectId: true } }
    }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return task
}

export async function reorderTasks(listId: string, taskIds: string[]) {
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    select: { projectId: true }
  })

  if (!list) throw new Error('List not found')
  if (!await hasProjectAccess(list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const updates = taskIds.map((id, index) =>
    prisma.task.update({
      where: { id },
      data: { position: index }
    })
  )

  await prisma.$transaction(updates)
  revalidatePath(`/projects/${list.projectId}`)

  return { success: true }
}

// =============================================================================
// SUBTASKS
// =============================================================================

export async function createSubtask(parentId: string, data: Omit<CreateTaskInput, 'parentId'>) {
  const parent = await prisma.task.findUnique({
    where: { id: parentId },
    select: { listId: true, statusId: true }
  })

  if (!parent) throw new Error('Parent task not found')

  return createTask({
    ...data,
    listId: parent.listId,
    statusId: data.statusId || parent.statusId,
    parentId,
  })
}

export async function getSubtasks(parentId: string) {
  const parent = await prisma.task.findUnique({
    where: { id: parentId },
    select: { list: { select: { projectId: true } } }
  })

  if (!parent) return []
  if (!await hasProjectAccess(parent.list.projectId, 'VIEWER')) throw new Error('Forbidden')

  return prisma.task.findMany({
    where: { parentId },
    include: {
      status: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { position: 'asc' }
  })
}

// =============================================================================
// DEPENDENCIES
// =============================================================================

export async function addDependency(
  predecessorId: string,
  successorId: string,
  type: string = 'FS',
  lagDays: number = 0
) {
  if (predecessorId === successorId) throw new Error('A task cannot depend on itself')

  const predecessor = await prisma.task.findUnique({
    where: { id: predecessorId },
    select: { list: { select: { projectId: true } } }
  })
  if (!predecessor) throw new Error('Task not found')
  if (!await hasProjectAccess(predecessor.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const existing = await prisma.taskDependency.findUnique({
    where: {
      predecessorId_successorId: {
        predecessorId: successorId,
        successorId: predecessorId
      }
    }
  })

  if (existing) throw new Error('This would create a circular dependency')

  return prisma.taskDependency.create({
    data: { predecessorId, successorId, type, lagDays },
    include: {
      predecessor: { select: { id: true, title: true } },
      successor: { select: { id: true, title: true } },
    }
  })
}

export async function removeDependency(predecessorId: string, successorId: string) {
  const predecessor = await prisma.task.findUnique({
    where: { id: predecessorId },
    select: { list: { select: { projectId: true } } }
  })
  if (!predecessor) throw new Error('Task not found')
  if (!await hasProjectAccess(predecessor.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  await prisma.taskDependency.delete({
    where: {
      predecessorId_successorId: { predecessorId, successorId }
    }
  })

  return { success: true }
}

export async function getDependencies(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { list: { select: { projectId: true } } }
  })

  if (!task) return { predecessors: [], successors: [] }
  if (!await hasProjectAccess(task.list.projectId, 'VIEWER')) throw new Error('Forbidden')

  const [predecessors, successors] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { successorId: taskId },
      include: {
        predecessor: {
          select: {
            id: true,
            title: true,
            status: { select: { name: true, color: true, isClosed: true } }
          }
        }
      }
    }),
    prisma.taskDependency.findMany({
      where: { predecessorId: taskId },
      include: {
        successor: {
          select: {
            id: true,
            title: true,
            status: { select: { name: true, color: true, isClosed: true } }
          }
        }
      }
    })
  ])

  return { predecessors, successors }
}

// =============================================================================
// TASK PROGRESS
// =============================================================================

export async function updateTaskProgress(taskId: string, progress: number) {
  const ref = await prisma.task.findUnique({
    where: { id: taskId },
    select: { list: { select: { projectId: true } } }
  })
  if (!ref) throw new Error('Task not found')
  if (!await hasProjectAccess(ref.list.projectId, 'EDITOR')) throw new Error('Forbidden')

  const clampedProgress = Math.max(0, Math.min(100, progress))

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { progress: clampedProgress },
    include: { list: { select: { projectId: true } } }
  })

  revalidatePath(`/projects/${task.list.projectId}`)
  return task
}

// =============================================================================
// GANTT DATA
// =============================================================================

export async function getTasksForGantt(projectId: string) {
  if (!await hasProjectAccess(projectId, 'VIEWER')) throw new Error('Forbidden')

  return prisma.task.findMany({
    where: {
      list: { projectId },
      parentId: null,
    },
    include: {
      status: true,
      list: { select: { name: true, color: true } },
      subtasks: {
        include: { status: true }
      },
      predecessors: {
        include: {
          predecessor: { select: { id: true } }
        }
      }
    },
    orderBy: [
      { startDate: 'asc' },
      { position: 'asc' }
    ]
  })
}

export async function createDefaultLists(projectId: string) {
  if (!await hasProjectAccess(projectId, 'MANAGER')) throw new Error('Forbidden')

  const lists = [
    { name: 'Backlog', color: '#6B7280', position: 0, description: 'Tasks to be done' },
    { name: 'In Progress', color: '#3B82F6', position: 1, description: 'Tasks currently being worked on' },
    { name: 'Review', color: '#F59E0B', position: 2, description: 'Tasks waiting for review' },
    { name: 'Done', color: '#10B981', position: 3, description: 'Completed tasks' }
  ]

  for (const list of lists) {
    await prisma.taskList.create({
      data: { ...list, projectId }
    })
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
