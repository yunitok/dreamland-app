/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

const mockCoverSnapshot = vi.hoisted(() => ({
  findMany: vi.fn(),
  aggregate: vi.fn(),
}))

const mockRestaurantLocation = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

const mockCoverSyncLog = vi.hoisted(() => ({
  findFirst: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coverSnapshot: mockCoverSnapshot,
    restaurantLocation: mockRestaurantLocation,
    coverSyncLog: mockCoverSyncLog,
  },
}))

import {
  getAnalyticsKpis,
  getCoversTrend,
  getLocationComparison,
  getWeekdayDistribution,
  getServiceSplit,
  getRestaurantLocations,
  getLastSyncInfo,
} from "@/modules/analytics/actions/cover-analytics"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LOCATION_IDS = ["loc-1"]
const DATE_START = "2026-01-01"
const DATE_END = "2026-01-31"

const MOCK_SNAPSHOT = {
  date: new Date("2026-01-15"),
  totalCovers: 120,
  totalReservations: 40,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getAnalyticsKpis", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve KPIs calculados correctamente", async () => {
    mockCoverSnapshot.findMany
      .mockResolvedValueOnce([MOCK_SNAPSHOT]) // current period
      .mockResolvedValueOnce([]) // previous period (no data)

    const result = await getAnalyticsKpis(LOCATION_IDS, DATE_START, DATE_END)

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result.totalCovers).toBe(120)
    expect(result.totalReservations).toBe(40)
    expect(result.avgPartySize).toBe(3) // 120/40
    expect(result.maxDayCovers).toBe(120)
    expect(result.coversDelta).toBeNull()
    expect(result.avgDailyDelta).toBeNull()
  })

  it("calcula deltas cuando hay periodo anterior", async () => {
    const prevSnapshot = { ...MOCK_SNAPSHOT, totalCovers: 100, date: new Date("2025-12-15") }
    mockCoverSnapshot.findMany
      .mockResolvedValueOnce([MOCK_SNAPSHOT]) // current
      .mockResolvedValueOnce([prevSnapshot]) // previous

    const result = await getAnalyticsKpis(LOCATION_IDS, DATE_START, DATE_END)

    expect(result.coversDelta).toBe(20) // ((120-100)/100)*100
    expect(result.avgDailyDelta).not.toBeNull()
  })

  it("lanza error si no tiene permiso", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(getAnalyticsKpis(LOCATION_IDS, DATE_START, DATE_END)).rejects.toThrow("Forbidden")
  })

  it("lanza error si prisma falla", async () => {
    mockCoverSnapshot.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getAnalyticsKpis(LOCATION_IDS, DATE_START, DATE_END)).rejects.toThrow("DB error")
  })
})

describe("getCoversTrend", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve tendencia diaria", async () => {
    mockCoverSnapshot.findMany.mockResolvedValue([
      { date: new Date("2026-01-15"), totalCovers: 100, totalReservations: 30 },
      { date: new Date("2026-01-16"), totalCovers: 80, totalReservations: 25 },
    ])

    const result = await getCoversTrend(LOCATION_IDS, DATE_START, DATE_END, "day")

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result).toHaveLength(2)
    expect(result[0].period).toBe("2026-01-15")
    expect(result[0].covers).toBe(100)
  })

  it("agrupa por mes", async () => {
    mockCoverSnapshot.findMany.mockResolvedValue([
      { date: new Date("2026-01-05"), totalCovers: 50, totalReservations: 10 },
      { date: new Date("2026-01-20"), totalCovers: 70, totalReservations: 20 },
    ])

    const result = await getCoversTrend(LOCATION_IDS, DATE_START, DATE_END, "month")

    expect(result).toHaveLength(1)
    expect(result[0].period).toBe("2026-01")
    expect(result[0].covers).toBe(120)
  })

  it("devuelve array vacio si no hay datos", async () => {
    mockCoverSnapshot.findMany.mockResolvedValue([])

    const result = await getCoversTrend(LOCATION_IDS, DATE_START, DATE_END, "day")

    expect(result).toEqual([])
  })
})

describe("getLocationComparison", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve comparacion por localizacion", async () => {
    mockCoverSnapshot.findMany.mockResolvedValue([
      {
        date: new Date("2026-01-15"),
        totalCovers: 100,
        restaurantLocation: { name: "Restaurante A" },
      },
      {
        date: new Date("2026-01-15"),
        totalCovers: 80,
        restaurantLocation: { name: "Restaurante B" },
      },
    ])

    const result = await getLocationComparison(LOCATION_IDS, DATE_START, DATE_END, "day")

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result).toHaveLength(1)
    expect(result[0]["Restaurante A"]).toBe(100)
    expect(result[0]["Restaurante B"]).toBe(80)
  })
})

describe("getWeekdayDistribution", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve distribucion por dia de la semana", async () => {
    // Wednesday = 3 in UTC
    mockCoverSnapshot.findMany.mockResolvedValue([
      { date: new Date("2026-01-14"), totalCovers: 100, totalReservations: 30 }, // Wednesday
    ])

    const result = await getWeekdayDistribution(LOCATION_IDS, DATE_START, DATE_END)

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result).toHaveLength(7)
    // Lunes a Domingo
    expect(result[0].day).toBe("Lunes")
    expect(result[6].day).toBe("Domingo")
  })

  it("devuelve ceros si no hay datos", async () => {
    mockCoverSnapshot.findMany.mockResolvedValue([])

    const result = await getWeekdayDistribution(LOCATION_IDS, DATE_START, DATE_END)

    expect(result).toHaveLength(7)
    result.forEach((d) => {
      expect(d.covers).toBe(0)
      expect(d.reservations).toBe(0)
      expect(d.avgCovers).toBe(0)
    })
  })
})

describe("getServiceSplit", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve reparto por servicio", async () => {
    mockCoverSnapshot.aggregate.mockResolvedValue({
      _sum: { lunchCovers: 200, dinnerCovers: 150, walkInCovers: 50 },
    })

    const result = await getServiceSplit(LOCATION_IDS, DATE_START, DATE_END)

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result).toEqual({ lunch: 200, dinner: 150, walkin: 50 })
  })

  it("devuelve ceros si _sum es null", async () => {
    mockCoverSnapshot.aggregate.mockResolvedValue({
      _sum: { lunchCovers: null, dinnerCovers: null, walkInCovers: null },
    })

    const result = await getServiceSplit(LOCATION_IDS, DATE_START, DATE_END)

    expect(result).toEqual({ lunch: 0, dinner: 0, walkin: 0 })
  })

  it("lanza error si prisma falla", async () => {
    mockCoverSnapshot.aggregate.mockRejectedValue(new Error("DB error"))

    await expect(getServiceSplit(LOCATION_IDS, DATE_START, DATE_END)).rejects.toThrow("DB error")
  })
})

describe("getRestaurantLocations", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve localizaciones activas con cmSlug", async () => {
    const locations = [
      { id: "loc-1", name: "Restaurante A", city: "Valencia", cmSlug: "rest-a" },
    ]
    mockRestaurantLocation.findMany.mockResolvedValue(locations)

    const result = await getRestaurantLocations()

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result).toEqual(locations)
  })

  it("lanza error si no tiene permiso", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(getRestaurantLocations()).rejects.toThrow("Forbidden")
  })
})

describe("getLastSyncInfo", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve info del ultimo sync", async () => {
    const syncLog = {
      status: "SUCCESS",
      startedAt: new Date(),
      finishedAt: new Date(),
      snapshotsCreated: 10,
      snapshotsUpdated: 5,
      errors: null,
    }
    mockCoverSyncLog.findFirst.mockResolvedValue(syncLog)

    const result = await getLastSyncInfo()

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics", "read")
    expect(result).toEqual(syncLog)
  })

  it("devuelve null si no hay logs", async () => {
    mockCoverSyncLog.findFirst.mockResolvedValue(null)

    const result = await getLastSyncInfo()

    expect(result).toBeNull()
  })

  it("lanza error si prisma falla", async () => {
    mockCoverSyncLog.findFirst.mockRejectedValue(new Error("DB error"))

    await expect(getLastSyncInfo()).rejects.toThrow("DB error")
  })
})
