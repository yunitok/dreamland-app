const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockFindMany = vi.hoisted(() => vi.fn())
const mockCount = vi.hoisted(() => vi.fn())
const mockUpdateMany = vi.hoisted(() => vi.fn())
const mockDeleteMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/actions/rbac", () => ({ requireAuth: mockRequireAuth }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: mockFindMany,
      count: mockCount,
      updateMany: mockUpdateMany,
      deleteMany: mockDeleteMany,
    },
  },
}))

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/modules/notifications/actions/notifications"

const authOk = { authenticated: true, userId: "user-1" }
const authFail = { authenticated: false }

describe("getNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(authOk)
    mockFindMany.mockResolvedValue([])
  })

  it("retorna notificaciones autenticado", async () => {
    mockFindMany.mockResolvedValue([{ id: "n1", title: "Test" }])
    const result = await getNotifications()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
    }))
  })

  it("retorna vacío sin autenticación", async () => {
    mockRequireAuth.mockResolvedValue(authFail)
    const result = await getNotifications()
    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
  })

  it("retorna vacío si prisma falla", async () => {
    mockFindMany.mockRejectedValue(new Error("DB"))
    const result = await getNotifications()
    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
  })
})

describe("getUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(authOk)
    mockCount.mockResolvedValue(0)
  })

  it("retorna count autenticado", async () => {
    mockCount.mockResolvedValue(5)
    const result = await getUnreadCount()
    expect(result.count).toBe(5)
  })

  it("retorna 0 sin autenticación", async () => {
    mockRequireAuth.mockResolvedValue(authFail)
    const result = await getUnreadCount()
    expect(result.count).toBe(0)
  })
})

describe("markAsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(authOk)
    mockUpdateMany.mockResolvedValue({ count: 1 })
  })

  it("marca como leída con userId", async () => {
    const result = await markAsRead("n1")
    expect(result.success).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-1" },
      data: { isRead: true },
    })
  })

  it("retorna false sin auth", async () => {
    mockRequireAuth.mockResolvedValue(authFail)
    const result = await markAsRead("n1")
    expect(result.success).toBe(false)
  })
})

describe("markAllAsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(authOk)
    mockUpdateMany.mockResolvedValue({ count: 3 })
  })

  it("marca todas como leídas", async () => {
    const result = await markAllAsRead()
    expect(result.success).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      data: { isRead: true },
    })
  })
})

describe("deleteNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(authOk)
    mockDeleteMany.mockResolvedValue({ count: 1 })
  })

  it("elimina con userId", async () => {
    const result = await deleteNotification("n1")
    expect(result.success).toBe(true)
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-1" },
    })
  })
})

describe("deleteAllNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(authOk)
    mockDeleteMany.mockResolvedValue({ count: 5 })
  })

  it("elimina todas del usuario", async () => {
    const result = await deleteAllNotifications()
    expect(result.success).toBe(true)
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
  })
})
