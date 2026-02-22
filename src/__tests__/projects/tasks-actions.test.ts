/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockHasProjectAccess = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())

const mockTask = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  aggregate: vi.fn(),
  updateMany: vi.fn(),
}))

const mockTaskList = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

const mockTaskStatus = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

const mockTransaction = vi.hoisted(() => vi.fn())

vi.mock("@/lib/actions/rbac", () => ({
  hasProjectAccess: mockHasProjectAccess,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: mockTask,
    taskList: mockTaskList,
    taskStatus: mockTaskStatus,
    $transaction: mockTransaction,
  },
}))

import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskProgress,
  moveTask,
} from "@/modules/projects/actions/tasks"

// ─── Datos de ejemplo ─────────────────────────────────────────────────────────

const MOCK_LIST = { id: "list-1", projectId: "proj-1" }

const MOCK_TASK = {
  id: "task-1",
  title: "Test Task",
  listId: "list-1",
  statusId: "status-1",
  assigneeId: "user-1",
  position: 0,
  status: { id: "status-1", name: "In Progress" },
  list: { id: "list-1", projectId: "proj-1", name: "Sprint 1" },
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockHasProjectAccess.mockResolvedValue(true)
})

// ─── getTasks ─────────────────────────────────────────────────────────────────

describe("getTasks", () => {
  it("llama hasProjectAccess con VIEWER", async () => {
    mockTask.findMany.mockResolvedValue([])
    await getTasks("proj-1")
    expect(mockHasProjectAccess).toHaveBeenCalledWith("proj-1", "VIEWER")
  })

  it("lanza Forbidden si hasProjectAccess devuelve false", async () => {
    mockHasProjectAccess.mockResolvedValue(false)
    await expect(getTasks("proj-1")).rejects.toThrow("Forbidden")
    expect(mockTask.findMany).not.toHaveBeenCalled()
  })

  it("llama findMany con where correcto (list.projectId, parentId:null)", async () => {
    mockTask.findMany.mockResolvedValue([MOCK_TASK])
    const result = await getTasks("proj-1")

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          list: { projectId: "proj-1" },
          parentId: null,
        },
      })
    )
    expect(result).toHaveLength(1)
  })

  it("el include contiene status, assignee, list, tags, subtasks, predecessors, successors, _count", async () => {
    mockTask.findMany.mockResolvedValue([])
    await getTasks("proj-1")

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          status: true,
          tags: true,
          subtasks: expect.anything(),
          predecessors: expect.anything(),
          successors: expect.anything(),
          _count: expect.anything(),
        }),
      })
    )
  })
})

// ─── createTask ───────────────────────────────────────────────────────────────

describe("createTask", () => {
  const INPUT = {
    title: "Nueva tarea",
    listId: "list-1",
    statusId: "status-1",
  }

  const CREATED_TASK = {
    ...MOCK_TASK,
    title: "Nueva tarea",
    position: 0,
    list: { id: "list-1", name: "Sprint 1", projectId: "proj-1" },
  }

  beforeEach(() => {
    mockTaskList.findUnique.mockResolvedValue(MOCK_LIST)
    mockTask.aggregate.mockResolvedValue({ _max: { position: null } })
    mockTask.create.mockResolvedValue(CREATED_TASK)
  })

  it("lanza 'List not found' si la lista no existe", async () => {
    mockTaskList.findUnique.mockResolvedValue(null)
    await expect(createTask(INPUT)).rejects.toThrow("List not found")
    expect(mockTask.create).not.toHaveBeenCalled()
  })

  it("llama hasProjectAccess con EDITOR tras encontrar la lista", async () => {
    await createTask(INPUT)
    expect(mockHasProjectAccess).toHaveBeenCalledWith("proj-1", "EDITOR")
  })

  it("lanza Forbidden si no tiene acceso EDITOR", async () => {
    mockHasProjectAccess.mockResolvedValue(false)
    await expect(createTask(INPUT)).rejects.toThrow("Forbidden")
    expect(mockTask.create).not.toHaveBeenCalled()
  })

  it("calcula posición como maxPosition + 1 cuando hay tareas existentes", async () => {
    mockTask.aggregate.mockResolvedValue({ _max: { position: 4 } })
    await createTask(INPUT)

    expect(mockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 5 }),
      })
    )
  })

  it("calcula posición 0 cuando no hay tareas (maxPosition null)", async () => {
    mockTask.aggregate.mockResolvedValue({ _max: { position: null } })
    await createTask(INPUT)

    expect(mockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      })
    )
  })

  it("llama revalidatePath con la ruta del proyecto", async () => {
    await createTask(INPUT)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects/proj-1")
  })

  it("retorna la tarea creada", async () => {
    const result = await createTask(INPUT)
    expect(result.id).toBe("task-1")
    expect(result.title).toBe("Nueva tarea")
  })

  it("conecta tags si se proporcionan tagIds", async () => {
    await createTask({ ...INPUT, tagIds: ["tag-1", "tag-2"] })

    expect(mockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: { connect: [{ id: "tag-1" }, { id: "tag-2" }] },
        }),
      })
    )
  })
})

// ─── updateTask ───────────────────────────────────────────────────────────────

describe("updateTask", () => {
  const UPDATED_TASK = {
    ...MOCK_TASK,
    title: "Tarea actualizada",
    list: { projectId: "proj-1" },
  }

  beforeEach(() => {
    mockTask.findUnique.mockResolvedValue(MOCK_TASK)
    mockTask.update.mockResolvedValue(UPDATED_TASK)
  })

  it("lanza 'Task not found' si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)
    await expect(updateTask("task-1", { title: "X" })).rejects.toThrow("Task not found")
    expect(mockTask.update).not.toHaveBeenCalled()
  })

  it("llama hasProjectAccess con EDITOR", async () => {
    await updateTask("task-1", { title: "Nueva" })
    expect(mockHasProjectAccess).toHaveBeenCalledWith("proj-1", "EDITOR")
  })

  it("lanza Forbidden si no tiene acceso EDITOR", async () => {
    mockHasProjectAccess.mockResolvedValue(false)
    await expect(updateTask("task-1", { title: "X" })).rejects.toThrow("Forbidden")
  })

  it("lanza error al mover fuera de Backlog sin assignee", async () => {
    // Tarea sin assignee
    mockTask.findUnique.mockResolvedValue({
      ...MOCK_TASK,
      assigneeId: null,
      status: { id: "status-backlog", name: "Backlog" },
    })
    // El nuevo status no es Backlog
    mockTaskStatus.findUnique.mockResolvedValue({ id: "status-2", name: "In Progress" })

    await expect(
      updateTask("task-1", { statusId: "status-2" })
    ).rejects.toThrow("Tasks must have an assignee before moving out of Backlog")
  })

  it("lanza error al quitar assignee de tarea fuera de Backlog", async () => {
    // Tarea en estado que NO es Backlog
    mockTask.findUnique.mockResolvedValue({
      ...MOCK_TASK,
      assigneeId: "user-1",
      status: { id: "status-1", name: "In Progress" },
    })

    await expect(
      updateTask("task-1", { assigneeId: null })
    ).rejects.toThrow("Cannot remove assignee from tasks outside of Backlog")
  })

  it("permite quitar assignee si la tarea está en Backlog", async () => {
    mockTask.findUnique.mockResolvedValue({
      ...MOCK_TASK,
      assigneeId: "user-1",
      status: { id: "status-backlog", name: "Backlog" },
    })
    mockTask.update.mockResolvedValue({
      ...UPDATED_TASK,
      assigneeId: null,
      status: { id: "status-backlog", name: "Backlog" },
    })

    await expect(updateTask("task-1", { assigneeId: null })).resolves.not.toThrow()
    expect(mockTask.update).toHaveBeenCalled()
  })

  it("no lanza error de Backlog si no se cambia statusId", async () => {
    // Tarea con assignee, no se cambia status
    await expect(updateTask("task-1", { title: "Solo título" })).resolves.not.toThrow()
    expect(mockTask.update).toHaveBeenCalled()
  })

  it("llama revalidatePath con la ruta del proyecto", async () => {
    await updateTask("task-1", { title: "X" })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects/proj-1")
  })

  it("retorna la tarea actualizada", async () => {
    const result = await updateTask("task-1", { title: "Tarea actualizada" })
    expect(result.title).toBe("Tarea actualizada")
  })
})

// ─── deleteTask ───────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  beforeEach(() => {
    mockTask.findUnique.mockResolvedValue(MOCK_TASK)
    mockTask.delete.mockResolvedValue(MOCK_TASK)
  })

  it("lanza 'Task not found' si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)
    await expect(deleteTask("task-1")).rejects.toThrow("Task not found")
    expect(mockTask.delete).not.toHaveBeenCalled()
  })

  it("llama hasProjectAccess con MANAGER", async () => {
    await deleteTask("task-1")
    expect(mockHasProjectAccess).toHaveBeenCalledWith("proj-1", "MANAGER")
  })

  it("lanza Forbidden si no tiene acceso MANAGER", async () => {
    mockHasProjectAccess.mockResolvedValue(false)
    await expect(deleteTask("task-1")).rejects.toThrow("Forbidden")
    expect(mockTask.delete).not.toHaveBeenCalled()
  })

  it("llama prisma.task.delete con where: { id }", async () => {
    await deleteTask("task-1")
    expect(mockTask.delete).toHaveBeenCalledWith({ where: { id: "task-1" } })
  })

  it("llama revalidatePath con la ruta del proyecto", async () => {
    await deleteTask("task-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects/proj-1")
  })

  it("retorna { success: true }", async () => {
    const result = await deleteTask("task-1")
    expect(result).toEqual({ success: true })
  })
})

// ─── updateTaskProgress ───────────────────────────────────────────────────────

describe("updateTaskProgress", () => {
  const TASK_WITH_PROJECT = {
    ...MOCK_TASK,
    list: { projectId: "proj-1" },
  }

  beforeEach(() => {
    mockTask.findUnique.mockResolvedValue(TASK_WITH_PROJECT)
    mockTask.update.mockResolvedValue(TASK_WITH_PROJECT)
  })

  it("lanza 'Task not found' si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)
    await expect(updateTaskProgress("task-1", 50)).rejects.toThrow("Task not found")
  })

  it("clampea valores superiores a 100 → guarda 100", async () => {
    await updateTaskProgress("task-1", 150)
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progress: 100 }),
      })
    )
  })

  it("clampea valores negativos → guarda 0", async () => {
    await updateTaskProgress("task-1", -10)
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progress: 0 }),
      })
    )
  })

  it("guarda el valor exacto cuando está en [0, 100]", async () => {
    await updateTaskProgress("task-1", 75)
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progress: 75 }),
      })
    )
  })

  it("clampea exactamente en los límites: 0 y 100 pasan sin cambio", async () => {
    await updateTaskProgress("task-1", 0)
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ progress: 0 }) })
    )

    vi.clearAllMocks()
    mockHasProjectAccess.mockResolvedValue(true)
    mockTask.findUnique.mockResolvedValue(TASK_WITH_PROJECT)
    mockTask.update.mockResolvedValue(TASK_WITH_PROJECT)

    await updateTaskProgress("task-1", 100)
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ progress: 100 }) })
    )
  })

  it("llama revalidatePath tras actualizar", async () => {
    await updateTaskProgress("task-1", 50)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects/proj-1")
  })
})

// ─── moveTask ─────────────────────────────────────────────────────────────────

describe("moveTask", () => {
  const MOVED_TASK = {
    ...MOCK_TASK,
    listId: "list-2",
    position: 2,
  }

  beforeEach(() => {
    mockTask.findUnique.mockResolvedValue(MOCK_TASK)
    mockTask.updateMany.mockResolvedValue({ count: 1 })
    mockTask.update.mockResolvedValue(MOVED_TASK)
  })

  it("lanza 'Task not found' si la tarea no existe", async () => {
    mockTask.findUnique.mockResolvedValue(null)
    await expect(moveTask("task-1", "list-2", 2)).rejects.toThrow("Task not found")
  })

  it("llama hasProjectAccess con EDITOR", async () => {
    await moveTask("task-1", "list-2", 2)
    expect(mockHasProjectAccess).toHaveBeenCalledWith("proj-1", "EDITOR")
  })

  it("lanza Forbidden si no tiene acceso EDITOR", async () => {
    mockHasProjectAccess.mockResolvedValue(false)
    await expect(moveTask("task-1", "list-2", 2)).rejects.toThrow("Forbidden")
  })

  it("hace shift de posiciones en lista destino (updateMany)", async () => {
    await moveTask("task-1", "list-2", 2)

    expect(mockTask.updateMany).toHaveBeenCalledWith({
      where: {
        listId: "list-2",
        position: { gte: 2 },
        parentId: null,
      },
      data: { position: { increment: 1 } },
    })
  })

  it("actualiza listId y position de la tarea movida", async () => {
    await moveTask("task-1", "list-2", 2)

    expect(mockTask.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: {
        listId: "list-2",
        position: 2,
      },
    })
  })

  it("llama revalidatePath tras mover", async () => {
    await moveTask("task-1", "list-2", 2)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects/proj-1")
  })

  it("retorna la tarea actualizada", async () => {
    const result = await moveTask("task-1", "list-2", 2)
    expect(result).toEqual(MOVED_TASK)
  })
})
