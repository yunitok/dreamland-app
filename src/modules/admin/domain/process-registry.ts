/**
 * Registry de procesos automáticos — definiciones en código.
 *
 * Cada proceso que la aplicación puede ejecutar (sync, cleanup, audit, etc.)
 * se define aquí con su metadata. Las ejecuciones se persisten en ProcessRun (DB).
 */

export interface ProcessOption {
  name: string
  label: string
  type: "boolean" | "text" | "number" | "date"
  defaultValue?: unknown
}

export interface ProcessDefinition {
  slug: string
  name: string
  description: string
  icon: string
  category: "sync" | "cleanup" | "alert"
  schedule?: string
  estimatedDuration: string
  executor: "internal" | "n8n" | "external"
  options?: ProcessOption[]
}

// ─── Catálogo de procesos ──────────────────────────────────────

export const PROCESS_DEFINITIONS: ProcessDefinition[] = [
  // ── Sincronización ──
  {
    slug: "gstock-sync",
    name: "Sincronización GStock",
    description:
      "Sincroniza recetas, ingredientes, proveedores y alérgenos desde la API de GStock hacia Sherlock DB y el Knowledge Base RAG.",
    icon: "RefreshCw",
    category: "sync",
    schedule: "Diario 7:00",
    estimatedDuration: "~8 min",
    executor: "internal",
    options: [
      { name: "dryRun", label: "Dry run (sin escritura)", type: "boolean", defaultValue: false },
      { name: "skipKb", label: "Saltar Knowledge Base", type: "boolean", defaultValue: false },
    ],
  },
  {
    slug: "kb-sync",
    name: "Sync Knowledge Base",
    description:
      "Genera entries de Knowledge Base desde las recetas sincronizadas y las indexa en Pinecone para el RAG.",
    icon: "BookOpen",
    category: "sync",
    schedule: "Bajo demanda (incluido en GStock sync fase 8)",
    estimatedDuration: "1-2 min",
    executor: "internal",
  },

  // ── Limpieza ──
  {
    slug: "cleanup-notifications",
    name: "Limpieza Notificaciones",
    description: "Elimina notificaciones con más de 30 días de antigüedad para evitar bloat en la base de datos.",
    icon: "Bell",
    category: "cleanup",
    schedule: "Diario 2:00",
    estimatedDuration: "<30s",
    executor: "internal",
  },
  {
    slug: "cleanup-ai-logs",
    name: "Limpieza Logs IA",
    description: "Elimina registros de uso de IA con más de 30 días de antigüedad.",
    icon: "Trash2",
    category: "cleanup",
    schedule: "Semanal lunes 3:00",
    estimatedDuration: "<1 min",
    executor: "internal",
    options: [
      { name: "days", label: "Días de retención", type: "number", defaultValue: 30 },
    ],
  },
  // ── Alertas ──
  {
    slug: "weather-check",
    name: "Alertas Meteorológicas",
    description:
      "Consulta predicciones de AEMET para ubicaciones activas y crea alertas si se detectan eventos adversos.",
    icon: "CloudRain",
    category: "alert",
    schedule: "Diario 8:00",
    estimatedDuration: "2-3 min",
    executor: "internal",
  },

]

// ─── Helpers ─────────────────────────────────────────────────

export function getProcessDefinition(slug: string): ProcessDefinition | undefined {
  return PROCESS_DEFINITIONS.find((p) => p.slug === slug)
}

export const PROCESS_CATEGORIES = {
  sync: { label: "Sincronización", color: "text-blue-500" },
  cleanup: { label: "Limpieza", color: "text-orange-500" },
  alert: { label: "Alertas", color: "text-red-500" },
} as const
