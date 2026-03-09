/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockGetSession = vi.hoisted(() => vi.fn())
const mockGetProcessDefinition = vi.hoisted(() => vi.fn())
const mockWithProcessTracking = vi.hoisted(() => vi.fn())

const MOCK_DEFINITIONS = vi.hoisted(() => [
  { slug: "gstock-sync", name: "GStock Sync", executor: "internal" },
  { slug: "cleanup-notifications", name: "Cleanup Notifications", executor: "internal" },
])

const mockProcessRun = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
}))

const mockNotification = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}))

const mockGlobalFetch = vi.hoisted(() => vi.fn())

vi.mock("@/lib/actions/rbac", () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock("@/lib/auth", () => ({
  getSession: mockGetSession,
}))

vi.mock("@/lib/process-runner", () => ({
  withProcessTracking: mockWithProcessTracking,
}))

vi.mock("@/modules/admin/domain/process-registry", () => ({
  PROCESS_DEFINITIONS: MOCK_DEFINITIONS,
  getProcessDefinition: mockGetProcessDefinition,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    processRun: mockProcessRun,
    notification: mockNotification,
  },
}))

// Mock global fetch
vi.stubGlobal("fetch", mockGlobalFetch)

import {
  getProcessDashboard,
  triggerProcess,
  getProcessHistory,
  cancelProcessRun,
  forceFailProcessRun,
} from "@/modules/admin/actions/processes"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_RUN = {
  id: "run-1",
  processSlug: "gstock-sync",
  status: "SUCCESS",
  triggerType: "MANUAL",
  startedAt: new Date("2026-01-15T10:00:00Z"),
  finishedAt: new Date("2026-01-15T10:05:00Z"),
  durationMs: 300000,
  output: { synced: 50 },
  error: null,
  triggeredBy: "user-1",
  phases: null,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getProcessDashboard", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve dashboard con ultimo run por proceso", async () => {
    mockProcessRun.findMany
      .mockResolvedValueOnce([MOCK_RUN]) // lastRuns
      .mockResolvedValueOnce([]) // runningRuns

    const result = await getProcessDashboard()

    expect(mockRequirePermission).toHaveBeenCalledWith("admin", "manage")
    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe("gstock-sync")
    expect(result[0].lastRun).not.toBeNull()
    expect(result[0].runningNow).toBe(false)
    expect(result[1].slug).toBe("cleanup-notifications")
    expect(result[1].lastRun).toBeNull()
  })

  it("marca proceso como runningNow si hay run activo", async () => {
    mockProcessRun.findMany
      .mockResolvedValueOnce([MOCK_RUN])
      .mockResolvedValueOnce([{ id: "run-active", processSlug: "gstock-sync" }])

    const result = await getProcessDashboard()

    expect(result[0].runningNow).toBe(true)
    expect(result[0].activeRunId).toBe("run-active")
  })

  it("lanza error si no tiene permiso", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(getProcessDashboard()).rejects.toThrow("Forbidden")
  })
})

describe("triggerProcess", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve error si el proceso no existe", async () => {
    mockGetProcessDefinition.mockReturnValue(null)

    const result = await triggerProcess("unknown-slug")

    expect(result.success).toBe(false)
    expect(result.error).toContain("Proceso desconocido")
  })

  it("registra proceso external como PENDING", async () => {
    mockGetProcessDefinition.mockReturnValue({ slug: "deploy", name: "Deploy", executor: "external" })
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockProcessRun.create.mockResolvedValue({ id: "run-ext" })

    const result = await triggerProcess("deploy")

    expect(result.success).toBe(true)
    expect(result.runId).toBe("run-ext")
    expect(mockProcessRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          triggerType: "MANUAL",
        }),
      })
    )
  })

  it("registra proceso n8n como PENDING", async () => {
    mockGetProcessDefinition.mockReturnValue({ slug: "n8n-proc", name: "N8N Proc", executor: "n8n" })
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockProcessRun.create.mockResolvedValue({ id: "run-n8n" })

    const result = await triggerProcess("n8n-proc")

    expect(result.success).toBe(true)
    expect(result.runId).toBe("run-n8n")
  })

  it("rechaza gstock-sync si ya hay uno en ejecucion", async () => {
    mockGetProcessDefinition.mockReturnValue({ slug: "gstock-sync", name: "GStock Sync", executor: "internal" })
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockProcessRun.findFirst.mockResolvedValue({ id: "run-active" })

    const result = await triggerProcess("gstock-sync")

    expect(result.success).toBe(false)
    expect(result.error).toContain("Ya hay una sincronizaci")
  })

  it("inicia gstock-sync si no hay uno activo", async () => {
    mockGetProcessDefinition.mockReturnValue({ slug: "gstock-sync", name: "GStock Sync", executor: "internal" })
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockProcessRun.findFirst.mockResolvedValue(null)
    mockProcessRun.create.mockResolvedValue({ id: "run-new", startedAt: new Date() })
    mockGlobalFetch.mockResolvedValue({ ok: true })

    const result = await triggerProcess("gstock-sync")

    expect(result.success).toBe(true)
    expect(result.runId).toBe("run-new")
    expect(mockGlobalFetch).toHaveBeenCalled()
  })

  it("ejecuta proceso interno con withProcessTracking", async () => {
    mockGetProcessDefinition.mockReturnValue({ slug: "cleanup-notifications", name: "Cleanup", executor: "internal" })
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockWithProcessTracking.mockResolvedValue({
      runId: "run-internal",
      result: { deleted: 5 },
    })

    const result = await triggerProcess("cleanup-notifications")

    expect(result.success).toBe(true)
    expect(result.runId).toBe("run-internal")
    expect(result.result).toEqual({ deleted: 5 })
  })

  it("devuelve error si withProcessTracking falla", async () => {
    mockGetProcessDefinition.mockReturnValue({ slug: "cleanup-notifications", name: "Cleanup", executor: "internal" })
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockWithProcessTracking.mockRejectedValue(new Error("Process failed"))

    const result = await triggerProcess("cleanup-notifications")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Process failed")
  })
})

describe("getProcessHistory", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve historial paginado", async () => {
    mockProcessRun.findMany.mockResolvedValue([MOCK_RUN])
    mockProcessRun.count.mockResolvedValue(1)

    const result = await getProcessHistory("gstock-sync", 1, 20)

    expect(mockRequirePermission).toHaveBeenCalledWith("admin", "manage")
    expect(result.runs).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.runs[0].id).toBe("run-1")
    expect(result.runs[0].startedAt).toBe("2026-01-15T10:00:00.000Z")
  })

  it("respeta paginacion", async () => {
    mockProcessRun.findMany.mockResolvedValue([])
    mockProcessRun.count.mockResolvedValue(50)

    await getProcessHistory("gstock-sync", 3, 10)

    expect(mockProcessRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    )
  })

  it("lanza error si prisma falla", async () => {
    mockProcessRun.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getProcessHistory("gstock-sync")).rejects.toThrow("DB error")
  })
})

describe("cancelProcessRun", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("cancela un run PENDING", async () => {
    mockProcessRun.findUnique.mockResolvedValue({ id: "run-1", status: "PENDING" })
    mockProcessRun.update.mockResolvedValue(undefined)

    const result = await cancelProcessRun("run-1")

    expect(mockRequirePermission).toHaveBeenCalledWith("admin", "manage")
    expect(result).toEqual({ success: true })
    expect(mockProcessRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    )
  })

  it("cancela un run RUNNING", async () => {
    mockProcessRun.findUnique.mockResolvedValue({ id: "run-1", status: "RUNNING" })
    mockProcessRun.update.mockResolvedValue(undefined)

    const result = await cancelProcessRun("run-1")

    expect(result).toEqual({ success: true })
  })

  it("devuelve error si el run no existe", async () => {
    mockProcessRun.findUnique.mockResolvedValue(null)

    const result = await cancelProcessRun("xxx")

    expect(result).toEqual({ success: false, error: "Run no encontrado" })
  })

  it("devuelve error si el run ya finalizo", async () => {
    mockProcessRun.findUnique.mockResolvedValue({ id: "run-1", status: "SUCCESS" })

    const result = await cancelProcessRun("run-1")

    expect(result.success).toBe(false)
    expect(result.error).toContain("No se puede cancelar")
  })
})

describe("forceFailProcessRun", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("fuerza fallo en un run RUNNING", async () => {
    mockProcessRun.findUnique.mockResolvedValue({
      id: "run-1",
      status: "RUNNING",
      startedAt: new Date("2026-01-15T10:00:00Z"),
      phases: [{ phase: 0 }, { phase: 1 }],
    })
    mockProcessRun.update.mockResolvedValue(undefined)

    const result = await forceFailProcessRun("run-1")

    expect(mockRequirePermission).toHaveBeenCalledWith("admin", "manage")
    expect(result).toEqual({ success: true })
    expect(mockProcessRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    )
  })

  it("usa razon personalizada si se proporciona", async () => {
    mockProcessRun.findUnique.mockResolvedValue({
      id: "run-1",
      status: "RUNNING",
      startedAt: new Date(),
      phases: [],
    })
    mockProcessRun.update.mockResolvedValue(undefined)

    await forceFailProcessRun("run-1", "Timeout manual")

    expect(mockProcessRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          error: "Timeout manual",
        }),
      })
    )
  })

  it("devuelve error si el run no existe", async () => {
    mockProcessRun.findUnique.mockResolvedValue(null)

    const result = await forceFailProcessRun("xxx")

    expect(result).toEqual({ success: false, error: "Run no encontrado" })
  })

  it("devuelve error si el run ya finalizo", async () => {
    mockProcessRun.findUnique.mockResolvedValue({ id: "run-1", status: "FAILED" })

    const result = await forceFailProcessRun("run-1")

    expect(result.success).toBe(false)
    expect(result.error).toContain("No se puede forzar fallo")
  })
})
