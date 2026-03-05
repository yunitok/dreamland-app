import type {
  CoverManagerStatsService,
  CoverManagerStatsResponse,
  DailyAggregate,
} from "./types"

// ─── Helpers ────────────────────────────────────────────────────

/** Suma comensales efectivos (seated + walkin) de un servicio */
function effectiveCovers(s: CoverManagerStatsService): number {
  return (s.people_seated || 0) + (s.people_walkin || 0)
}

/** Suma total de reservas efectivas (seated + walkin) de un servicio */
function effectiveReservations(s: CoverManagerStatsService): number {
  return (s.reservs_seated || 0) + (s.reservs_walkin || 0)
}

/** Extrae desglose por estado de un servicio (people) */
function statusBreakdown(s: CoverManagerStatsService): Record<string, number> {
  const map: Record<string, number> = {}
  const entries: Array<[string, number]> = [
    ["seated", s.people_seated || 0],
    ["walkin", s.people_walkin || 0],
    ["cancelled", s.people_cancel || 0],
    ["noshow", s.people_noshow || 0],
    ["pending", s.people_pending || 0],
    ["confirmed", s.people_confirm || 0],
  ]
  for (const [key, value] of entries) {
    if (value > 0) map[key] = (map[key] || 0) + value
  }
  return map
}

// ─── Función principal ──────────────────────────────────────────

/**
 * Convierte la respuesta de stats/get_resumen_date en un DailyAggregate.
 * No necesita coversByHour porque este endpoint no proporciona desglose horario.
 */
export function aggregateFromStats(
  date: string,
  stats: CoverManagerStatsResponse
): DailyAggregate {
  const lunch = stats.lunch || ({} as CoverManagerStatsService)
  const dinner = stats.dinner || ({} as CoverManagerStatsService)

  const lunchCovers = effectiveCovers(lunch)
  const dinnerCovers = effectiveCovers(dinner)
  const totalCovers = lunchCovers + dinnerCovers

  const lunchReservs = effectiveReservations(lunch)
  const dinnerReservs = effectiveReservations(dinner)
  const totalReservations = lunchReservs + dinnerReservs

  const avgPartySize =
    totalReservations > 0 ? totalCovers / totalReservations : 0

  // Merge status breakdowns de ambos servicios
  const lunchStatus = statusBreakdown(lunch)
  const dinnerStatus = statusBreakdown(dinner)
  const coversByStatus: Record<string, number> = {}
  for (const key of new Set([
    ...Object.keys(lunchStatus),
    ...Object.keys(dinnerStatus),
  ])) {
    coversByStatus[key] = (lunchStatus[key] || 0) + (dinnerStatus[key] || 0)
  }

  const walkInCovers = (lunch.people_walkin || 0) + (dinner.people_walkin || 0)

  return {
    date,
    totalCovers,
    totalReservations,
    avgPartySize,
    maxPartySize: 0, // No disponible en stats/get_resumen_date
    coversByStatus,
    lunchCovers,
    dinnerCovers,
    walkInCovers,
  }
}
