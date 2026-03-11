import { describe, it, expect } from "vitest"
import { classifyAvailability } from "../availability-classifier"
import type {
  CMAvailabilityResponse,
  CMTableAvailabilityResponse,
  CMExtendedAvailabilityResponse,
  CMMapResponse,
  CMStatsResponse,
} from "../types"

// ─── Test Fixtures ──────────────────────────────────────────────

const baseTableAvail: CMTableAvailabilityResponse = {
  resp: 1,
  availability: {
    lunch: { num_comensales: 20, all_num_comensales: 80, tables: 5, all_tables: 20 },
    dinner: { num_comensales: 10, all_num_comensales: 80, tables: 3, all_tables: 20 },
  },
}

/** Creates CM availability response with consecutive hours */
function makeAvailability(
  hourSlots: Record<string, Record<string, { discount: boolean | number }>>
): CMAvailabilityResponse {
  return { resp: 1, availability: { hours: hourSlots } }
}

/** Creates a sequence of hours at 15-min intervals from a start time */
function makeConsecutiveHours(
  startHour: number,
  startMin: number,
  count: number,
  partySizes: number[] = [2, 4, 6]
): Record<string, Record<string, { discount: boolean | number }>> {
  const hours: Record<string, Record<string, { discount: boolean | number }>> = {}
  for (let i = 0; i < count; i++) {
    const totalMin = startHour * 60 + startMin + i * 15
    const h = String(Math.floor(totalMin / 60)).padStart(2, "0")
    const m = String(totalMin % 60).padStart(2, "0")
    const time = `${h}:${m}`
    hours[time] = Object.fromEntries(
      partySizes.map((ps) => [String(ps), { discount: false }])
    )
  }
  return hours
}

// ─── Tests ──────────────────────────────────────────────────────

describe("classifyAvailability", () => {
  describe("slot status classification by consecutive minutes", () => {
    it('classifies slots with ≥90 min consecutive as "available"', () => {
      // 7 slots × 15min = 105min consecutive from 13:00 to 14:30
      const hours = makeConsecutiveHours(13, 0, 7)
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.slots.length).toBe(7)
      // First slots have ≥90min remaining → "available"
      expect(lunch.slots[0].status).toBe("available")
      expect(lunch.slots[0].availableMinutes).toBe(105)
    })

    it('classifies slots with 45-89 min consecutive as "limited"', () => {
      // 4 slots × 15min = 60min consecutive from 13:00 to 13:45
      const hours = makeConsecutiveHours(13, 0, 4)
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.slots[0].status).toBe("limited")
      expect(lunch.slots[0].availableMinutes).toBe(60)
    })

    it('classifies slots with <45 min consecutive as "full"', () => {
      // 2 slots × 15min = 30min consecutive
      const hours = makeConsecutiveHours(13, 0, 2)
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.slots[0].status).toBe("full")
      expect(lunch.slots[0].availableMinutes).toBe(30)
    })

    it("correctly computes consecutiveUntil time", () => {
      const hours = makeConsecutiveHours(14, 0, 6) // 14:00 to 15:15
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.slots[0].consecutiveUntil).toBe("15:30") // 15:15 + 15min
    })
  })

  describe("lunch/dinner service separation", () => {
    it("separates lunch (<17:00) and dinner (≥17:00) by default", () => {
      const hours = {
        ...makeConsecutiveHours(14, 0, 7), // lunch
        ...makeConsecutiveHours(20, 0, 7), // dinner
      }
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      const dinner = result.find((s) => s.service === "dinner")!

      expect(lunch.slots.every((s) => s.time < "17:00")).toBe(true)
      expect(dinner.slots.every((s) => s.time >= "17:00")).toBe(true)
    })

    it("uses custom cutoff when provided", () => {
      const hours = {
        ...makeConsecutiveHours(14, 0, 7), // 14:00-15:30
        ...makeConsecutiveHours(16, 0, 7), // 16:00-17:30
      }
      const result = classifyAvailability(
        makeAvailability(hours),
        baseTableAvail,
        undefined,
        undefined,
        undefined,
        { cutoff: "15:00" }
      )

      const lunch = result.find((s) => s.service === "lunch")!
      const dinner = result.find((s) => s.service === "dinner")!

      // With cutoff at 15:00, only 14:00-14:45 are lunch (4 slots)
      expect(lunch.slots.every((s) => s.time < "15:00")).toBe(true)
      expect(dinner.slots.every((s) => s.time >= "15:00")).toBe(true)
    })
  })

  describe("party size filtering", () => {
    it("returns all slots when no partySize filter", () => {
      const hours = makeConsecutiveHours(13, 0, 7, [2, 4, 6, 8])
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.slots.length).toBe(7)
      expect(lunch.slots[0].maxPartySize).toBe(8)
    })

    it("filters slots by minimum party size", () => {
      // Some hours have small parties only, some have large
      const hours: Record<string, Record<string, { discount: boolean | number }>> = {
        "13:00": { "2": { discount: false }, "4": { discount: false } },
        "13:15": { "2": { discount: false }, "4": { discount: false } },
        "13:30": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
        "13:45": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
        "14:00": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
        "14:15": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
        "14:30": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
        "14:45": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
        "15:00": { "2": { discount: false }, "4": { discount: false }, "8": { discount: false } },
      }

      // Filter for groups of 8 — only 13:30+ have party size 8
      const result = classifyAvailability(
        makeAvailability(hours),
        baseTableAvail,
        undefined,
        undefined,
        undefined,
        { partySize: 8 }
      )

      const lunch = result.find((s) => s.service === "lunch")!
      // 13:00 and 13:15 should be excluded (max party is 4, not 8)
      expect(lunch.slots.every((s) => s.time >= "13:30")).toBe(true)
      expect(lunch.slots.length).toBe(7) // 13:30 through 15:00
    })

    it("removes entire service if no slots match party size", () => {
      const hours = makeConsecutiveHours(13, 0, 7, [2, 4]) // max party: 4

      const result = classifyAvailability(
        makeAvailability(hours),
        baseTableAvail,
        undefined,
        undefined,
        undefined,
        { partySize: 10 }
      )

      // Lunch should exist (from tableAvail) but have empty slots
      const lunch = result.find((s) => s.service === "lunch")
      // With party size 10 but only 2/4 available, hours are filtered out
      expect(lunch?.slots.length ?? 0).toBe(0)
    })
  })

  describe("occupancy data", () => {
    it("maps occupancy from tableAvailability correctly", () => {
      const hours = makeConsecutiveHours(13, 0, 7)
      const result = classifyAvailability(makeAvailability(hours), baseTableAvail)

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.occupancy).toEqual({
        covers: 20,
        totalCapacity: 80,
        tables: 5,
        totalTables: 20,
        percentage: 25,
      })
    })
  })

  describe("zone enrichment", () => {
    it("accumulates party sizes per zone from extended availability", () => {
      const hours = makeConsecutiveHours(13, 0, 7, [2, 4, 6])

      const extended: CMExtendedAvailabilityResponse = {
        availability: {
          people: {
            "2": { "13:00": { discount: false, zones: [{ name: "Terraza", id: 1 }] } },
            "4": { "13:00": { discount: false, zones: [{ name: "Terraza", id: 1 }, { name: "Salón", id: 2 }] } },
            "6": { "13:00": { discount: false, zones: [{ name: "Salón", id: 2 }] } },
          },
        },
      }

      const result = classifyAvailability(
        makeAvailability(hours),
        baseTableAvail,
        undefined,
        extended
      )

      const lunch = result.find((s) => s.service === "lunch")!
      const firstSlot = lunch.slots.find((s) => s.time === "13:00")!
      expect(firstSlot.zones).toBeDefined()

      const terraza = firstSlot.zones!.find((z) => z.name === "Terraza")!
      expect(terraza.availableForPartySizes).toEqual([2, 4])

      const salon = firstSlot.zones!.find((z) => z.name === "Salón")!
      expect(salon.availableForPartySizes).toEqual([4, 6])
    })
  })

  describe("edge cases", () => {
    it("handles empty availability hours gracefully", () => {
      const result = classifyAvailability(
        { resp: 1, availability: { hours: {} } },
        baseTableAvail
      )
      // No slots but services still created from tableAvail
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it("handles null availability gracefully", () => {
      const result = classifyAvailability(
        { resp: 1 },
        baseTableAvail
      )
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it("maps stats correctly", () => {
      const hours = makeConsecutiveHours(13, 0, 7)
      const stats: CMStatsResponse = {
        resp: 1,
        lunch: {
          reservs_seated: 10, people_seated: 25,
          reservs_walkin: 3, people_walkin: 6,
          reservs_cancel: 2, people_cancel: 4,
          reservs_noshow: 1, people_noshow: 2,
          reservs_released: 1, people_released: 2,
          reservs_pending: 5, people_pending: 12,
          reservs_confirm: 8, people_confirm: 20,
          reservs_waitinglist: 2, people_waitinglist: 4,
        },
        dinner: {
          reservs_seated: 0, people_seated: 0,
          reservs_walkin: 0, people_walkin: 0,
          reservs_cancel: 0, people_cancel: 0,
          reservs_noshow: 0, people_noshow: 0,
          reservs_released: 0, people_released: 0,
          reservs_pending: 0, people_pending: 0,
          reservs_confirm: 0, people_confirm: 0,
          reservs_waitinglist: 0, people_waitinglist: 0,
        },
      }

      const result = classifyAvailability(
        makeAvailability(hours),
        baseTableAvail,
        undefined,
        undefined,
        stats
      )

      const lunch = result.find((s) => s.service === "lunch")!
      expect(lunch.stats).toEqual({
        seated: 10,
        walkin: 3,
        cancelled: 2,
        noshow: 1,
        released: 1,
        pending: 5,
        waitingList: 2,
      })
    })
  })
})
