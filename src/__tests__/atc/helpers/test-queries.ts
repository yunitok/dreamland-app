/**
 * Queries de test extraídas de scripts/diagnose-rag.ts
 * Reutilizables en tests de integración y e2e.
 */
export const TEST_QUERIES = [
  { query: "¿Tenéis terraza exterior?", expectedCategory: "ESPACIOS", expectResults: true },
  { query: "¿El restaurante es accesible para personas en silla de ruedas?", expectedCategory: "ACCESIBILIDAD", expectResults: true },
  { query: "¿Cuál es el horario de apertura?", expectedCategory: "HORARIOS", expectResults: true },
  { query: "¿Qué platos no tienen gluten?", expectedCategory: "ALERGENOS", expectResults: true },
  { query: "¿Se admiten perros?", expectedCategory: "GENERAL", expectResults: true },
  { query: "¿Cuántas personas caben en el salón privado?", expectedCategory: "ESPACIOS", expectResults: true },
  { query: "¿Hay aparcamiento?", expectedCategory: "GENERAL", expectResults: true },
  // Guardrail: consulta irrelevante — debe retornar 0 resultados
  { query: "¿Cuál es el precio del bitcoin hoy?", expectedCategory: "N/A", expectResults: false },
]

export const SCORE_THRESHOLD = 0.55
