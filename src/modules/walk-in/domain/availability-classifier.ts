import type {
  CMAvailabilityResponse,
  CMTableAvailabilityResponse,
  ServiceAvailability,
  TimeSlot,
  SlotStatus,
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
  cmTableAvailability: CMTableAvailabilityResponse
): ServiceAvailability[] {
  const { hours } = cmAvailability.availability

  // Get all available hours sorted
  const allHours = Object.keys(hours).sort()

  // Split into lunch/dinner
  const lunchHours = allHours.filter((h) => h < SERVICE_CUTOFF)
  const dinnerHours = allHours.filter((h) => h >= SERVICE_CUTOFF)

  const services: ServiceAvailability[] = []

  if (lunchHours.length > 0 || cmTableAvailability.availability.lunch) {
    services.push(
      buildServiceAvailability(
        "lunch",
        lunchHours,
        hours,
        cmTableAvailability.availability.lunch
      )
    )
  }

  if (dinnerHours.length > 0 || cmTableAvailability.availability.dinner) {
    services.push(
      buildServiceAvailability(
        "dinner",
        dinnerHours,
        hours,
        cmTableAvailability.availability.dinner
      )
    )
  }

  return services
}

function buildServiceAvailability(
  service: "lunch" | "dinner",
  availableHours: string[],
  hoursData: CMAvailabilityResponse["availability"]["hours"],
  occupancy: CMTableAvailabilityResponse["availability"]["lunch"]
): ServiceAvailability {
  const slots: TimeSlot[] = availableHours.map((time, index) => {
    // Max party size = highest number key available at this hour
    const partySizes = Object.keys(hoursData[time]).map(Number)
    const maxPartySize = Math.max(...partySizes, 0)

    // Calculate consecutive available time from this slot
    const status = classifySlot(time, index, availableHours)

    return { time, status, maxPartySize }
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
  }
}

function classifySlot(
  time: string,
  index: number,
  allHours: string[]
): SlotStatus {
  // Count consecutive slots starting from this one
  const startMin = timeToMinutes(time)
  let endMin = startMin

  for (let i = index + 1; i < allHours.length; i++) {
    const nextMin = timeToMinutes(allHours[i])
    // Consecutive = within 15-minute gap (CoverManager uses 15-min intervals)
    if (nextMin - endMin <= 15) {
      endMin = nextMin
    } else {
      break
    }
  }

  // Add 15 min for the last slot itself
  const availableMinutes = endMin - startMin + 15

  if (availableMinutes >= STANDARD_DURATION_MIN) return "available"
  if (availableMinutes >= SHORT_DURATION_MIN) return "limited"
  return "full"
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}
