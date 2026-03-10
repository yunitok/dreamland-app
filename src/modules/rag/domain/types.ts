import type { Tool } from "ai"

// ─── Dominio RAG (registry) ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = Tool<any, any>

export interface KBDomain {
  /** Identificador unico del dominio (ej: "atc", "gastrolab-recipes", "finance") */
  id: string
  /** Nombre visible en la UI */
  label: string
  /** Namespace de Pinecone para este dominio */
  namespace: string
  /** Recurso RBAC que controla el acceso (ej: "atc", "gastrolab", "knowledge-base") */
  rbacResource: string
  /** System prompt del chat para este dominio */
  systemPrompt: string
  /** Prompt HyDE personalizado (opcional, usa default si no se proporciona) */
  hydePrompt?: string
  /** Prompt de normalizacion personalizado (opcional) */
  normalizePrompt?: string
  /** Factory de tools adicionales del dominio (ej: lookupReservation para ATC) */
  toolsFactory?: () => Record<string, AnyTool>
  /** Preguntas sugeridas para el chat */
  suggestedQuestions?: string[]
  /** Sources permitidos para filtrar en Pinecone */
  allowedSources?: string[]
  /** Path base para revalidatePath (ej: "/atc/knowledge-base") */
  revalidatePath?: string
  /** Si se habilita trazabilidad en Query/QueryResolution */
  enableTracking?: boolean
}

// ─── Tipos de datos de KB ────────────────────────────────────────

export interface BulkKBEntry {
  title: string
  content: string
  section?: string
  categoryId?: string
  source?: string
  language?: string
}
