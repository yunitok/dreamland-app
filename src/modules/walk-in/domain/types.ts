// ─── CoverManager API Response Types ────────────────────────────

/** Response from POST reserv/availability */
export interface CMAvailabilityResponse {
  resp: number
  availability?: {
    /** Keyed by party size ("2", "3", ...), each containing hours with discount info */
    people?: Record<string, Record<string, { discount: boolean | number }>>
    /** Keyed by hour ("14:30", "20:00", ...), each containing party sizes with discount info */
    hours?: Record<string, Record<string, { discount: boolean | number }>>
  }
}

/** Response from GET restaurant/table_availability */
export interface CMTableAvailabilityResponse {
  resp: number
  availability: {
    lunch: CMServiceOccupancy
    dinner: CMServiceOccupancy
  }
}

export interface CMServiceOccupancy {
  num_comensales: number      // Comensales ocupados
  all_num_comensales: number  // Capacidad total comensales
  tables: number              // Mesas ocupadas
  all_tables: number          // Mesas totales
}

// ─── Classified Availability Types ──────────────────────────────

export type SlotStatus = "available" | "limited" | "full"

export interface TimeSlot {
  time: string          // "14:30"
  status: SlotStatus
  maxPartySize: number  // Max people available at this slot
}

export interface ServiceAvailability {
  service: "lunch" | "dinner"
  label: string
  slots: TimeSlot[]
  occupancy: {
    covers: number
    totalCapacity: number
    tables: number
    totalTables: number
    percentage: number  // 0-100
  }
}

export interface WalkInAvailability {
  restaurant: {
    name: string
    address: string
    city: string
    slug: string
  }
  date: string            // ISO date
  services: ServiceAvailability[]
  lastUpdated: string     // ISO timestamp
}
