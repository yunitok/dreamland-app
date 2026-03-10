// ─── Tipos para sincronización CoverManager → CoverSnapshot ────

/** Estructura de respuesta de stats/get_resumen_date */
export interface CoverManagerStatsService {
  reservs_no_complete: number
  people_no_complete: number
  reservs_toreview: number
  people_toreview: number
  reservs_noshow: number
  people_noshow: number
  reservs_cancel: number
  people_cancel: number
  reservs_pending: number
  people_pending: number
  reservs_confirm: number
  people_confirm: number
  reservs_reconfirm: number
  people_reconfirm: number
  reservs_seated: number
  people_seated: number
  reservs_walkin: number
  people_walkin: number
  reservs_arrival: number
  people_arrived: number
  reservs_released: number
  people_released: number
  reservs_billrequest: number
  people_billrequest: number
  reservs_desert: number
  people_desert: number
  reservs_arrivalbar: number
  people_arrivalbar: number
  reservs_toclean: number
  people_toclean: number
  reservs_waitinglist: number
  people_waitinglist: number
  reservs_custom: number
  people_custom: number
}

export interface CoverManagerStatsResponse {
  resp: number
  lunch: CoverManagerStatsService
  dinner: CoverManagerStatsService
}

/** Agregado diario calculado a partir de la respuesta de stats */
export interface DailyAggregate {
  date: string
  totalCovers: number
  totalReservations: number
  avgPartySize: number
  maxPartySize: number
  coversByStatus: Record<string, number>
  lunchCovers: number
  dinnerCovers: number
  walkInCovers: number
}

/** Resultado de sincronización de un restaurante */
export interface CoverSyncReport {
  restaurant: string
  dateRange: { start: string; end: string }
  snapshotsCreated: number
  snapshotsUpdated: number
  errors: string[]
  durationMs: number
}

/** Opciones de sincronización */
export interface CoverSyncOptions {
  restaurantLocationId?: string
  dateStart: string // "2023-03-04"
  dateEnd: string // "2026-03-04"
  dryRun?: boolean
  verbose?: boolean
  onProgress?: (phase: string, detail: string) => void
}
