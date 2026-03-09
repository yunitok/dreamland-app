const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockGroupByEmailInbox = vi.hoisted(() => vi.fn())
const mockCountEmailInbox = vi.hoisted(() => vi.fn())
const mockFindManyEmailInbox = vi.hoisted(() => vi.fn())
const mockFindManyEmailCategory = vi.hoisted(() => vi.fn())
const mockGroupByIncident = vi.hoisted(() => vi.fn())
const mockCountQuery = vi.hoisted(() => vi.fn())
const mockCountQueryResolution = vi.hoisted(() => vi.fn())

vi.mock("@/lib/actions/rbac", () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailInbox: {
      groupBy: mockGroupByEmailInbox,
      count: mockCountEmailInbox,
      findMany: mockFindManyEmailInbox,
    },
    emailCategory: {
      findMany: mockFindManyEmailCategory,
    },
    incident: {
      groupBy: mockGroupByIncident,
    },
    query: {
      count: mockCountQuery,
    },
    queryResolution: {
      count: mockCountQueryResolution,
    },
  },
}))

import {
  getUnreadByCategory,
  getEmailKpis,
  getIncidentSummary,
  getQuerySummary,
  getEmailVolumeByDay,
} from "@/modules/atc/actions/atc-analytics"

describe("getUnreadByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: groupBy retorna resultados para las 3 queries + findMany para categorías
    mockGroupByEmailInbox.mockResolvedValue([])
    mockFindManyEmailCategory.mockResolvedValue([])
  })

  it("requiere permiso read:atc", async () => {
    await getUnreadByCategory()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("agrupa correctamente por categoría", async () => {
    mockGroupByEmailInbox
      .mockResolvedValueOnce([{ categoryId: "cat-1", _count: { id: 5 } }]) // unread
      .mockResolvedValueOnce([{ categoryId: "cat-1", _count: { id: 1 } }]) // urgent
      .mockResolvedValueOnce([{ categoryId: "cat-1", _count: { id: 2 } }]) // high
    mockFindManyEmailCategory.mockResolvedValue([
      { id: "cat-1", name: "Reservas", slug: "reservas", color: "#3B82F6", icon: null },
    ])

    const result = await getUnreadByCategory()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data![0]).toMatchObject({
      categoryId: "cat-1",
      categoryName: "Reservas",
      unreadCount: 5,
      urgentCount: 1,
      highCount: 2,
      normalCount: 2, // 5 - 1 - 2
    })
  })

  it("ordena por unreadCount descendente", async () => {
    mockGroupByEmailInbox
      .mockResolvedValueOnce([
        { categoryId: "cat-1", _count: { id: 2 } },
        { categoryId: "cat-2", _count: { id: 10 } },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    mockFindManyEmailCategory.mockResolvedValue([
      { id: "cat-1", name: "A", slug: "a", color: "#000", icon: null },
      { id: "cat-2", name: "B", slug: "b", color: "#000", icon: null },
    ])

    const result = await getUnreadByCategory()
    expect(result.data![0].unreadCount).toBe(10)
    expect(result.data![1].unreadCount).toBe(2)
  })

  it("retorna error si prisma falla", async () => {
    mockGroupByEmailInbox.mockRejectedValue(new Error("DB error"))
    const result = await getUnreadByCategory()
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe("getEmailKpis", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getEmailKpis hace 5 counts + 1 findMany en Promise.all
    mockCountEmailInbox.mockResolvedValue(0)
    mockFindManyEmailInbox.mockResolvedValue([])
  })

  it("requiere permiso read:atc", async () => {
    await getEmailKpis()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("retorna KPIs correctos", async () => {
    mockCountEmailInbox
      .mockResolvedValueOnce(50)  // totalUnread
      .mockResolvedValueOnce(10)  // actionRequiredPending
      .mockResolvedValueOnce(5)   // unassigned
      .mockResolvedValueOnce(3)   // pendingDrafts
      .mockResolvedValueOnce(12)  // totalToday
    mockFindManyEmailInbox.mockResolvedValue([])

    const result = await getEmailKpis()
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      totalUnread: 50,
      actionRequiredPending: 10,
      unassigned: 5,
      pendingDrafts: 3,
      totalToday: 12,
    })
  })

  it("avgResponseTimeMinutes es null cuando no hay replies", async () => {
    mockCountEmailInbox.mockResolvedValue(0)
    mockFindManyEmailInbox.mockResolvedValue([])

    const result = await getEmailKpis()
    expect(result.data!.avgResponseTimeMinutes).toBeNull()
  })

  it("calcula avgResponseTimeMinutes correctamente", async () => {
    mockCountEmailInbox.mockResolvedValue(0)
    mockFindManyEmailInbox.mockResolvedValue([
      {
        receivedAt: new Date("2026-03-01T10:00:00Z"),
        replies: [{ sentAt: new Date("2026-03-01T10:30:00Z") }],
      },
      {
        receivedAt: new Date("2026-03-01T12:00:00Z"),
        replies: [{ sentAt: new Date("2026-03-01T13:00:00Z") }],
      },
    ])

    const result = await getEmailKpis()
    expect(result.data!.avgResponseTimeMinutes).toBe(45) // (30 + 60) / 2
  })

  it("retorna error si prisma falla", async () => {
    mockCountEmailInbox.mockRejectedValue(new Error("DB error"))
    const result = await getEmailKpis()
    expect(result.success).toBe(false)
  })
})

describe("getIncidentSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGroupByIncident.mockResolvedValue([])
  })

  it("requiere permiso read:atc", async () => {
    await getIncidentSummary()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("agrupa por severity", async () => {
    mockGroupByIncident.mockResolvedValue([
      { severity: "HIGH", _count: { id: 3 } },
      { severity: "LOW", _count: { id: 7 } },
    ])

    const result = await getIncidentSummary()
    expect(result.success).toBe(true)
    expect(result.data).toEqual([
      { severity: "HIGH", count: 3 },
      { severity: "LOW", count: 7 },
    ])
  })

  it("retorna error si prisma falla", async () => {
    mockGroupByIncident.mockRejectedValue(new Error("DB error"))
    const result = await getIncidentSummary()
    expect(result.success).toBe(false)
  })
})

describe("getQuerySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCountQuery.mockResolvedValue(0)
    mockCountQueryResolution.mockResolvedValue(0)
  })

  it("retorna counts correctos", async () => {
    mockCountQuery
      .mockResolvedValueOnce(15)  // open
      .mockResolvedValueOnce(3)   // escalated
    mockCountQueryResolution
      .mockResolvedValueOnce(8)   // aiResolved
      .mockResolvedValueOnce(4)   // humanResolved

    const result = await getQuerySummary()
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      openCount: 15,
      escalatedCount: 3,
      aiResolved: 8,
      humanResolved: 4,
    })
  })

  it("retorna error si prisma falla", async () => {
    mockCountQuery.mockRejectedValue(new Error("DB error"))
    const result = await getQuerySummary()
    expect(result.success).toBe(false)
  })
})

describe("getEmailVolumeByDay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindManyEmailInbox.mockResolvedValue([])
  })

  it("pre-fills días vacíos con count=0", async () => {
    mockFindManyEmailInbox.mockResolvedValue([])

    const result = await getEmailVolumeByDay(7)
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(7)
    expect(result.data!.every((d: { count: number }) => d.count === 0)).toBe(true)
  })

  it("cuenta emails por día correctamente", async () => {
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    mockFindManyEmailInbox.mockResolvedValue([
      { receivedAt: today },
      { receivedAt: today },
    ])

    const result = await getEmailVolumeByDay(7)
    expect(result.success).toBe(true)
    const todayStr = today.toISOString().slice(0, 10)
    const todayPoint = result.data!.find((d: { date: string }) => d.date === todayStr)
    expect(todayPoint?.count).toBe(2)
  })

  it("retorna error si prisma falla", async () => {
    mockFindManyEmailInbox.mockRejectedValue(new Error("DB error"))
    const result = await getEmailVolumeByDay()
    expect(result.success).toBe(false)
  })
})
