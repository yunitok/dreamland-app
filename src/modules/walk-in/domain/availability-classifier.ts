import type {
  CMAvailabilityResponse,
  CMTableAvailabilityResponse,
  CMMapResponse,
  CMExtendedAvailabilityResponse,
  CMStatsResponse,
  ServiceAvailability,
  ServiceStats,
  TimeSlot,
  SlotStatus,
  SlotZone,
  TableZoneSummary,
} from "./types"

/** Hour that separates lunch from dinner */
const SERVICE_CUTOFF = "17:00"

/** Standard reservation duration in minutes */
const STANDARD_DURATION_MIN = 90

/** Minimum "short table" duration in minutes */
const SHORT_DURATION_MIN = 45

/**
 * Classifies CoverManager availability data into a structured format
 * with color-coded slots (available/limited/full).
 *
 * Logic:
 * - A slot appearing in CM response = there is capacity
 * - "available": consecutive slots span >= 90 min (standard reservation)
 * - "limited": consecutive slots span >= 45 min but < 90 min
 * - Slots NOT in CM response = "full" (we don't show them)
 */
export function classifyAvailability(
  cmAvailability: CMAvailabilityResponse,
  cmTableAvailability: CMTableAvailabilityResponse,
  cmMap?: CMMapResponse,
  cmExtended?: CMExtendedAvailabilityResponse,
  cmStats?: CMStatsResponse,
  options?: { partySize?: number; cutoff?: string }
): ServiceAvailability[] {
  const rawHours = (cmAvailability.availability?.hours ?? {}) as Record<
    string,
    Record<string, { discount: boolean | number }>
  >

  const minPartySize = options?.partySize
  const serviceCutoff = options?.cutoff ?? SERVICE_CUTOFF

  // Filter hours by party size: keep only hours where at least one party size >= requested
  const hours: typeof rawHours = {}
  for (const [time, partySizes] of Object.entries(rawHours)) {
    if (minPartySize) {
      const filtered = Object.fromEntries(
        Object.entries(partySizes).filter(([key]) => parseInt(key, 10) >= minPartySize)
      )
      if (Object.keys(filtered).length > 0) {
        hours[time] = filtered
      }
    } else {
      hours[time] = partySizes
    }
  }

  // Get all available hours sorted
  const allHours = Object.keys(hours).sort()

  // Split into lunch/dinner using configurable cutoff
  const lunchHours = allHours.filter((h) => h < serviceCutoff)
  const dinnerHours = allHours.filter((h) => h >= serviceCutoff)

  // Summarize table zones from get_map (if available)
  const tableZones = cmMap ? summarizeTableZones(cmMap) : undefined

  // Build zone lookup from get_map: id_zone → { tableCount, minCap, maxCap }
  const zoneTableMap = cmMap ? buildZoneTableMap(cmMap) : undefined

  // Build per-hour zone availability from availability_extended
  const hourZones = cmExtended ? buildHourZoneMap(cmExtended, zoneTableMap) : undefined

  const services: ServiceAvailability[] = []

  if (lunchHours.length > 0 || cmTableAvailability.availability.lunch) {
    services.push(
      buildServiceAvailability(
        "lunch",
        lunchHours,
        hours,
        cmTableAvailability.availability.lunch,
        tableZones,
        hourZones,
        cmStats ? mapStats(cmStats.lunch) : undefined
      )
    )
  }

  if (dinnerHours.length > 0 || cmTableAvailability.availability.dinner) {
    services.push(
      buildServiceAvailability(
        "dinner",
        dinnerHours,
        hours,
        cmTableAvailability.availability.dinner,
        tableZones,
        hourZones,
        cmStats ? mapStats(cmStats.dinner) : undefined
      )
    )
  }

  return services
}

function buildServiceAvailability(
  service: "lunch" | "dinner",
  availableHours: string[],
  hoursData: NonNullable<NonNullable<CMAvailabilityResponse["availability"]>["hours"]>,
  occupancy: CMTableAvailabilityResponse["availability"]["lunch"],
  tableZones?: TableZoneSummary[],
  hourZones?: Map<string, SlotZone[]>,
  stats?: ServiceStats
): ServiceAvailability {
  const slots: TimeSlot[] = availableHours.map((time, index) => {
    // All party sizes available at this hour (sorted)
    const partySizes = Object.keys(hoursData[time]).map(Number).sort((a, b) => a - b)
    const maxPartySize = Math.max(...partySizes, 0)

    // Calculate consecutive available time from this slot
    const { status, availableMinutes, consecutiveUntil } = classifySlot(time, index, availableHours)

    // Zones available at this hour
    const zones = hourZones?.get(time)

    return { time, status, maxPartySize, availableMinutes, consecutiveUntil, partySizes, zones }
  })

  const occ = occupancy ?? { num_comensales: 0, all_num_comensales: 0, tables: 0, all_tables: 0 }

  return {
    service,
    label: service === "lunch" ? "Comida" : "Cena",
    slots,
    occupancy: {
      covers: occ.num_comensales,
      totalCapacity: occ.all_num_comensales,
      tables: occ.tables,
      totalTables: occ.all_tables,
      percentage: occ.all_num_comensales > 0
        ? Math.round((occ.num_comensales / occ.all_num_comensales) * 100)
        : 0,
    },
    tableZones,
    stats,
  }
}

// ─── Slot classification ─────────────────────────────────────────

interface SlotClassification {
  status: SlotStatus
  availableMinutes: number
  consecutiveUntil: string
}

function classifySlot(
  time: string,
  index: number,
  allHours: string[]
): SlotClassification {
  const startMin = timeToMinutes(time)
  let endMin = startMin

  for (let i = index + 1; i < allHours.length; i++) {
    const nextMin = timeToMinutes(allHours[i])
    if (nextMin - endMin <= 15) {
      endMin = nextMin
    } else {
      break
    }
  }

  const availableMinutes = endMin - startMin + 15
  const consecutiveUntil = minutesToTime(endMin + 15)

  let status: SlotStatus
  if (availableMinutes >= STANDARD_DURATION_MIN) status = "available"
  else if (availableMinutes >= SHORT_DURATION_MIN) status = "limited"
  else status = "full"

  return { status, availableMinutes, consecutiveUntil }
}

// ─── Zone helpers ────────────────────────────────────────────────

interface ZoneTableInfo {
  tableCount: number
  minCapacity: number
  maxCapacity: number
}

/** Build a map from zone ID → table summary from get_map */
function buildZoneTableMap(cmMap: CMMapResponse): Map<string, ZoneTableInfo> {
  const map = new Map<string, ZoneTableInfo>()

  for (const table of cmMap.tables) {
    const zoneId = table.id_zone
    const existing = map.get(zoneId)
    const tMin = Number(table.min) || 1
    const tMax = Number(table.max) || tMin

    if (existing) {
      existing.tableCount++
      existing.minCapacity = Math.min(existing.minCapacity, tMin)
      existing.maxCapacity = Math.max(existing.maxCapacity, tMax)
    } else {
      map.set(zoneId, { tableCount: 1, minCapacity: tMin, maxCapacity: tMax })
    }
  }

  return map
}

/**
 * Build a map of hour → SlotZone[] from availability_extended.
 * Merges zone data across all party sizes for each hour,
 * accumulating which party sizes each zone supports.
 */
function buildHourZoneMap(
  cmExtended: CMExtendedAvailabilityResponse,
  zoneTableMap?: Map<string, ZoneTableInfo>
): Map<string, SlotZone[]> {
  const hourZones = new Map<string, Map<number, SlotZone & { _partySizes: Set<number> }>>()

  const people = cmExtended.availability?.people
  if (!people) return new Map()

  for (const [partySizeStr, hours] of Object.entries(people)) {
    const ps = parseInt(partySizeStr, 10)
    for (const [hour, data] of Object.entries(hours)) {
      if (!data.zones?.length) continue

      if (!hourZones.has(hour)) {
        hourZones.set(hour, new Map())
      }
      const zoneMap = hourZones.get(hour)!

      for (const zone of data.zones) {
        const existing = zoneMap.get(zone.id)
        if (existing) {
          existing._partySizes.add(ps)
        } else {
          const tableInfo = zoneTableMap?.get(String(zone.id))
          zoneMap.set(zone.id, {
            name: zone.name,
            id: zone.id,
            tableCount: tableInfo?.tableCount ?? 0,
            minCapacity: tableInfo?.minCapacity ?? 0,
            maxCapacity: tableInfo?.maxCapacity ?? 0,
            _partySizes: new Set([ps]),
          })
        }
      }
    }
  }

  // Convert to Map<string, SlotZone[]>, materializing party sizes
  const result = new Map<string, SlotZone[]>()
  for (const [hour, zoneMap] of hourZones) {
    result.set(
      hour,
      Array.from(zoneMap.values()).map(({ _partySizes, ...zone }) => ({
        ...zone,
        availableForPartySizes: Array.from(_partySizes).sort((a, b) => a - b),
      }))
    )
  }
  return result
}

// ─── Stats helper ────────────────────────────────────────────────

function mapStats(cm: CMStatsResponse["lunch"]): ServiceStats {
  return {
    seated: cm.reservs_seated,
    walkin: cm.reservs_walkin,
    cancelled: cm.reservs_cancel,
    noshow: cm.reservs_noshow,
    released: cm.reservs_released,
    pending: cm.reservs_pending,
    waitingList: cm.reservs_waitinglist,
  }
}

// ─── Table zone summary (from get_map) ──────────────────────────

function summarizeTableZones(cmMap: CMMapResponse): TableZoneSummary[] {
  const zoneMap = new Map<string, { count: number; min: number; max: number }>()

  for (const table of cmMap.tables) {
    const floor = table.name_floor || "Sin zona"
    const existing = zoneMap.get(floor)
    const tMin = Number(table.min) || 1
    const tMax = Number(table.max) || tMin

    if (existing) {
      existing.count++
      existing.min = Math.min(existing.min, tMin)
      existing.max = Math.max(existing.max, tMax)
    } else {
      zoneMap.set(floor, { count: 1, min: tMin, max: tMax })
    }
  }

  return Array.from(zoneMap.entries()).map(([floor, data]) => ({
    floor,
    tableCount: data.count,
    minCapacity: data.min,
    maxCapacity: data.max,
  }))
}

// ─── Utility ─────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
