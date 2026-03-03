import { tool } from "ai"
import { z } from "zod"
import { generateEmbedding, generateHyDEQuery } from "@/lib/embeddings"
import { searchSimilar } from "@/lib/pinecone"
import { prisma } from "@/lib/prisma"

// Umbrales de similitud coseno
const SCORE_THRESHOLD_DIRECT = 0.65
const SCORE_THRESHOLD_HYDE = 0.55
const HYDE_TRIGGER = 0.70

type MessagePart = { type: string; text?: string }
export type IncomingMessage = { role: string; content?: string; parts?: MessagePart[] }

export function extractTextContent(msg: IncomingMessage): string {
  if (typeof msg.content === "string" && msg.content) return msg.content
  if (msg.parts) {
    return msg.parts.filter(p => p.type === "text").map(p => p.text ?? "").join("")
  }
  return ""
}

export async function fetchKBEntries(ids: string[]) {
  const rawEntries = await prisma.knowledgeBase.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, title: true, content: true, section: true },
  })
  return ids
    .map(id => rawEntries.find(e => e.id === id))
    .filter(Boolean) as Array<{ id: string; title: string; content: string; section: string | null }>
}

/**
 * Crea el tool de busqueda en la Knowledge Base con HyDE progresivo.
 * Parametrizado por namespace de Pinecone y prompt HyDE del dominio.
 */
export function createSearchKnowledgeBaseTool(
  namespace: string,
  categoryId?: string,
  scoreRef?: { value: number },
  hydePrompt?: string
) {
  return tool({
    description:
      "Busca informacion verificada en la base de conocimiento. " +
      "Usala para responder preguntas sobre cualquier tema documentado en el sistema.",
    inputSchema: z.object({
      query: z.string().describe("La consulta o pregunta en lenguaje natural"),
      categoryFilter: z
        .string()
        .optional()
        .describe("ID de categoria para filtrar resultados (opcional)"),
    }),
    execute: async ({ query, categoryFilter }) => {
      try {
        const filterCatId = categoryFilter ?? categoryId ?? undefined

        // 1. Retrieval directo con la query original
        const queryEmbedding = await generateEmbedding(query)
        let results = await searchSimilar(
          queryEmbedding,
          5,
          filterCatId ? { categoryId: filterCatId } : undefined,
          SCORE_THRESHOLD_DIRECT,
          namespace
        )

        // 2. HyDE progresivo: si el top score es bajo, generar respuesta hipotetica
        if ((results[0]?.score ?? 0) < HYDE_TRIGGER) {
          const hydeQuery = await generateHyDEQuery(query, hydePrompt)
          const hydeEmbedding = await generateEmbedding(hydeQuery)
          const hydeResults = await searchSimilar(
            hydeEmbedding,
            5,
            filterCatId ? { categoryId: filterCatId } : undefined,
            SCORE_THRESHOLD_HYDE,
            namespace
          )
          // Fusionar y deduplicar por id, priorizando mayor score
          const seen = new Set<string>()
          results = [...results, ...hydeResults]
            .sort((a, b) => b.score - a.score)
            .filter(r => !seen.has(r.id) && seen.add(r.id))
            .slice(0, 5)
        }

        if (scoreRef) {
          scoreRef.value = Math.max(scoreRef.value, results[0]?.score ?? 0)
        }

        if (!results.length) {
          return {
            found: false,
            entries: [] as Array<{ id: string; title: string; section: string | null; content: string }>,
            message:
              "No se encontro informacion relevante para esta consulta. " +
              "Sugiere al cliente contactar directamente.",
          }
        }

        const entries = await fetchKBEntries(results.map(r => r.id))
        return {
          found: true,
          entries: entries.map(e => ({
            id: e.id,
            title: e.title,
            section: e.section,
            content: e.content,
          })),
        }
      } catch (e) {
        console.error("[searchKnowledgeBase] Error:", e)
        return {
          found: false,
          entries: [] as Array<{ id: string; title: string; section: string | null; content: string }>,
          message: "Error al buscar informacion.",
        }
      }
    },
  })
}
