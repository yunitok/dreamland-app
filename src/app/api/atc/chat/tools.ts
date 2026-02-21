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
 * Crea el tool de búsqueda en la Knowledge Base con HyDE progresivo.
 * Recibe un ref mutable para escribir el topScore (para trazabilidad).
 */
export function createSearchKnowledgeBaseTool(
  categoryId?: string,
  scoreRef?: { value: number }
) {
  return tool({
    description:
      "Busca información verificada en la base de conocimiento del restaurante. " +
      "Úsala para responder preguntas sobre espacios, menús, alérgenos, horarios, " +
      "accesibilidad y cualquier servicio del restaurante.",
    inputSchema: z.object({
      query: z.string().describe("La consulta o pregunta del cliente en lenguaje natural"),
      categoryFilter: z
        .string()
        .optional()
        .describe("ID de categoría para filtrar resultados (opcional)"),
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
          SCORE_THRESHOLD_DIRECT
        )

        // 2. HyDE progresivo: si el top score es bajo, generar respuesta hipotética
        if ((results[0]?.score ?? 0) < HYDE_TRIGGER) {
          const hydeQuery = await generateHyDEQuery(query)
          const hydeEmbedding = await generateEmbedding(hydeQuery)
          const hydeResults = await searchSimilar(
            hydeEmbedding,
            5,
            filterCatId ? { categoryId: filterCatId } : undefined,
            SCORE_THRESHOLD_HYDE
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
              "No se encontró información relevante para esta consulta. " +
              "Sugiere al cliente contactar directamente con el restaurante.",
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
          message: "Error al buscar información.",
        }
      }
    },
  })
}

export function createLookupReservationTool() {
  return tool({
    description:
      "Busca reservas existentes por nombre del cliente o por fecha. " +
      "Úsala cuando el agente pregunte por una reserva concreta o quiera verificarla.",
    inputSchema: z.object({
      guestName: z
        .string()
        .optional()
        .describe("Nombre del cliente (búsqueda parcial, no sensible a mayúsculas)"),
      date: z
        .string()
        .optional()
        .describe("Fecha en formato YYYY-MM-DD para buscar reservas de ese día"),
    }),
    execute: async ({ guestName, date }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { status: { notIn: ["CANCELLED", "NO_SHOW"] } }
        if (guestName) {
          where.guestName = { contains: guestName, mode: "insensitive" }
        }
        if (date) {
          const start = new Date(date)
          start.setHours(0, 0, 0, 0)
          const end = new Date(date)
          end.setHours(23, 59, 59, 999)
          where.date = { gte: start, lte: end }
        }

        const reservations = await prisma.reservation.findMany({
          where,
          select: {
            id: true,
            guestName: true,
            guestPhone: true,
            date: true,
            time: true,
            partySize: true,
            status: true,
            notes: true,
          },
          orderBy: [{ date: "asc" }, { time: "asc" }],
          take: 5,
        })

        if (!reservations.length) {
          return { found: false, message: "No se encontraron reservas con esos datos.", reservations: [] }
        }

        return {
          found: true,
          message: null,
          reservations: reservations.map(r => ({
            guestName: r.guestName,
            guestPhone: r.guestPhone,
            date: r.date.toISOString().split("T")[0],
            time: r.time,
            partySize: r.partySize,
            status: r.status,
            notes: r.notes,
          })),
        }
      } catch (e) {
        console.error("[lookupReservation] Error:", e)
        return { found: false, message: "Error al buscar reservas.", reservations: [] }
      }
    },
  })
}

export function createGetActiveIncidentsTool() {
  return tool({
    description:
      "Obtiene las incidencias activas y alertas meteorológicas del restaurante. " +
      "Úsala cuando el agente pregunte por problemas actuales, cierres o incidencias operativas.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const [incidents, weatherAlerts] = await Promise.all([
          prisma.incident.findMany({
            where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
            select: {
              type: true,
              description: true,
              severity: true,
              status: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.weatherAlert.findMany({
            where: { status: { in: ["ACTIVE", "MONITORING"] } },
            select: {
              alertType: true,
              severity: true,
              description: true,
              forecastDate: true,
              precipitationMm: true,
              windSpeedKmh: true,
              temperatureC: true,
              action: true,
              status: true,
              triggeredAt: true,
            },
            orderBy: { severity: "desc" },
            take: 5,
          }),
        ])

        return {
          incidents: incidents.map(i => ({
            type: i.type,
            description: i.description,
            severity: i.severity,
            status: i.status,
          })),
          weatherAlerts: weatherAlerts.map(w => ({
            alertType: w.alertType,
            severity: w.severity,
            description: w.description,
            forecastDate: w.forecastDate.toISOString(),
            precipitationMm: w.precipitationMm,
            windSpeedKmh: w.windSpeedKmh,
            temperatureC: w.temperatureC,
            action: w.action,
            status: w.status,
            triggeredAt: w.triggeredAt?.toISOString() ?? null,
          })),
          hasActiveIssues: incidents.length > 0 || weatherAlerts.length > 0,
        }
      } catch (e) {
        console.error("[getActiveIncidents] Error:", e)
        return { incidents: [], weatherAlerts: [], hasActiveIssues: false }
      }
    },
  })
}

export function createCheckWaitingListTool() {
  return tool({
    description:
      "Comprueba la lista de espera para una fecha concreta. " +
      "Úsala cuando el agente pregunte cuántas personas esperan mesa o quiera apuntar a alguien.",
    inputSchema: z.object({
      date: z.string().describe("Fecha en formato YYYY-MM-DD"),
    }),
    execute: async ({ date }) => {
      try {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        const entries = await prisma.waitingList.findMany({
          where: {
            requestedDate: { gte: start, lte: end },
            notified: false,
          },
          select: {
            guestName: true,
            partySize: true,
            priority: true,
            notes: true,
          },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        })

        return {
          date,
          totalWaiting: entries.length,
          entries: entries.slice(0, 8).map((e, i) => ({
            position: i + 1,
            guestName: e.guestName,
            partySize: e.partySize,
            priority: e.priority,
            notes: e.notes,
          })),
        }
      } catch (e) {
        console.error("[checkWaitingList] Error:", e)
        return { date, totalWaiting: 0, entries: [] }
      }
    },
  })
}
