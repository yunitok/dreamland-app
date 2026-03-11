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

/** Response from POST apiV2/availability_extended (show_zones=1) */
export interface CMExtendedAvailabilityResponse {
  availability?: {
    /** Keyed by party size, then hour → { discount, zones[] } */
    people?: Record<string, Record<string, {
      discount: number | boolean
      zones?: Array<{ name: string; id: number }>
    }>>
  }
}

/** Response from POST stats/get_resumen_date */
export interface CMStatsResponse {
  resp: number
  lunch: CMServiceStats
  dinner: CMServiceStats
}

export interface CMServiceStats {
  reservs_seated: number
  people_seated: number
  reservs_walkin: number
  people_walkin: number
  reservs_cancel: number
  people_cancel: number
  reservs_noshow: number
  people_noshow: number
  reservs_released: number
  people_released: number
  reservs_pending: number
  people_pending: number
  reservs_confirm: number
  people_confirm: number
  reservs_waitinglist: number
  people_waitinglist: number
}

/** Response from GET restaurant/get_map — inventario estático de mesas */
export interface CMMapResponse {
  tables: CMMapTable[]
}

export interface CMMapTable {
  id_table: number
  name_table: string
  min: string             // Capacidad mínima (string de CM)
  max: string             // Capacidad máxima (string de CM)
  shape: string           // "cuadrada" | "alargadav" | etc.
  id_zone: string
  name_floor: string      // Zona/planta (ej: "Salón bajo voltereta")
  hilo: string
  type: string
  x: string | null
  y: string | null
}

// ─── Classified Availability Types ──────────────────────────────

export type SlotStatus = "available" | "limited" | "full"

/** Zona disponible en un slot específico */
export interface SlotZone {
  name: string          // "Selva Ubud", "Villa Seminyak"
  id: number            // id_zone de CM
  tableCount: number    // mesas en esa zona (de get_map)
  minCapacity: number
  maxCapacity: number
  availableForPartySizes?: number[]  // Qué tamaños de grupo caben en esta zona
}

export interface TimeSlot {
  time: string          // "14:30"
  status: SlotStatus
  maxPartySize: number  // Max people available at this slot
  // Debug — siempre computados, solo visibles para admin
  availableMinutes?: number      // Minutos consecutivos desde este slot
  consecutiveUntil?: string      // Hora fin de la ventana (ej: "14:30")
  partySizes?: number[]          // Todos los tamaños de grupo disponibles
  zones?: SlotZone[]             // Zonas con disponibilidad (de availability_extended)
}

/** Resumen de mesas agrupado por zona/planta */
export interface TableZoneSummary {
  floor: string           // name_floor
  tableCount: number
  minCapacity: number
  maxCapacity: number
}

/** Stats de reservas por servicio (solo admin) */
export interface ServiceStats {
  seated: number
  walkin: number
  cancelled: number
  noshow: number
  released: number
  pending: number
  waitingList: number
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
  tableZones?: TableZoneSummary[]  // Solo presente si get_map responde OK
  stats?: ServiceStats             // Solo presente si stats responde OK
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
  filteredPartySize?: number  // Si se filtró por tamaño de grupo
}
