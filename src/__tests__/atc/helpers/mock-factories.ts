/**
 * Factories reutilizables para tests del pipeline RAG y módulo ATC.
 */

export const MOCK_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i * 0.001)

export const THRESHOLDS = {
  SCORE_DIRECT: 0.65,
  SCORE_HYDE: 0.55,
  HYDE_TRIGGER: 0.70,
}

export function createMockKBEntry(overrides?: Record<string, unknown>) {
  return {
    id: "kb-test-1",
    title: "Terraza exterior — Horario y capacidad",
    content: "Nuestra terraza exterior dispone de 40 plazas.",
    section: "Espacios exteriores",
    categoryId: "cat-espacios",
    source: "seed",
    active: true,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  }
}

export function createMockReservation(overrides?: Record<string, unknown>) {
  return {
    id: "res-test-1",
    guestName: "Juan García",
    guestPhone: "+34600111222",
    date: new Date("2026-02-20"),
    time: "21:00",
    partySize: 4,
    status: "CONFIRMED",
    notes: null,
    ...overrides,
  }
}

export function createMockIncident(overrides?: Record<string, unknown>) {
  return {
    type: "COMPLAINT",
    description: "Cliente reporta ruido excesivo en salón",
    severity: "MEDIUM",
    status: "OPEN",
    createdAt: new Date("2026-02-19"),
    ...overrides,
  }
}

export function createMockWeatherAlert(overrides?: Record<string, unknown>) {
  return {
    alertType: "STORM",
    action: "Cerrar terraza y reubicar reservas",
    threshold: "Viento > 60 km/h",
    triggeredAt: new Date("2026-02-19T14:00:00Z"),
    isActive: true,
    ...overrides,
  }
}

export function createMockWaitingListEntry(overrides?: Record<string, unknown>) {
  return {
    guestName: "Ana López",
    partySize: 2,
    priority: 5,
    notes: "Prefiere terraza",
    notified: false,
    requestedDate: new Date("2026-02-20"),
    createdAt: new Date("2026-02-19"),
    ...overrides,
  }
}

export function createMockSession(overrides?: Record<string, unknown>) {
  return {
    user: {
      id: "user-test-1",
      name: "Test User",
      email: "test@dreamland.com",
      role: "SUPER_ADMIN",
      ...(overrides?.user as Record<string, unknown> ?? {}),
    },
    ...overrides,
  }
}

export function createPineconeMatch(
  id: string,
  score: number,
  metadata: Record<string, unknown> = {}
) {
  return {
    id,
    score,
    metadata: {
      title: "Default Title",
      section: null,
      categoryId: "cat-default",
      source: "seed",
      active: true,
      ...metadata,
    },
  }
}
