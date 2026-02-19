import { streamText, tool, stepCountIs } from "ai"
import { z } from "zod"
import { getChatLanguageModel } from "@/lib/ai/config"
import { getSession } from "@/lib/auth"
import { generateEmbedding, generateHyDEQuery } from "@/lib/embeddings"
import { searchSimilar } from "@/lib/pinecone"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const maxDuration = 60

// Umbrales de similitud coseno
const SCORE_THRESHOLD_DIRECT = 0.65 // Para la búsqueda directa con seed v2
const SCORE_THRESHOLD_HYDE = 0.55   // Para la búsqueda HyDE (más permisiva)
const HYDE_TRIGGER = 0.70            // Si topScore < 0.70 → activar HyDE

const SYSTEM_PROMPT = `Eres el asistente de Atención al Cliente (ATC) de Dreamland Restaurant.
Ayudas al equipo de sala a responder consultas de clientes de forma rápida y precisa.

CAPACIDADES:
- Buscar información verificada sobre espacios, menús, alérgenos, horarios y servicios
- Consultar reservas existentes por nombre de cliente o fecha
- Ver incidencias activas y alertas operativas del restaurante
- Comprobar la lista de espera para una fecha concreta

REGLAS ESTRICTAS:
1. Para info de espacios/menús/alérgenos/horarios → usa SIEMPRE la herramienta searchKnowledgeBase
2. Para reservas de clientes → usa lookupReservation con el nombre o la fecha
3. NUNCA inventes datos. Si una herramienta no devuelve resultados → indícalo claramente
4. Responde en español, de forma profesional, concisa y amable
5. Cuando uses searchKnowledgeBase, cita la fuente: [Fuente: nombre]
6. Si no puedes ayudar con algo, indica qué información necesitarías para hacerlo`

type MessagePart = { type: string; text?: string }
type IncomingMessage = { role: string; content?: string; parts?: MessagePart[] }

function extractTextContent(msg: IncomingMessage): string {
  if (typeof msg.content === "string" && msg.content) return msg.content
  if (msg.parts) {
    return msg.parts.filter(p => p.type === "text").map(p => p.text ?? "").join("")
  }
  return ""
}

async function fetchKBEntries(ids: string[]) {
  const rawEntries = await prisma.knowledgeBase.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, title: true, content: true, section: true },
  })
  return ids
    .map(id => rawEntries.find(e => e.id === id))
    .filter(Boolean) as Array<{ id: string; title: string; content: string; section: string | null }>
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { messages, categoryId } = await req.json()
  if (!Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 })
  }

  const lastUserMsg = [...messages].reverse().find((m: IncomingMessage) => m.role === "user")
  const userQuery = lastUserMsg ? extractTextContent(lastUserMsg) : ""

  const history = (messages as IncomingMessage[]).slice(-6).map(m => ({
    role: m.role as "user" | "assistant",
    content: extractTextContent(m),
  }))

  // Para trazabilidad: capturar el score más alto de las búsquedas
  let lastSearchTopScore = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = streamText({
    model: getChatLanguageModel(),
    temperature: 0.1,
    maxOutputTokens: 600,
    stopWhen: stepCountIs(5),
    system: SYSTEM_PROMPT,
    messages: history as any,
    tools: {
      searchKnowledgeBase: tool({
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

            lastSearchTopScore = Math.max(lastSearchTopScore, results[0]?.score ?? 0)

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
      }),

      lookupReservation: tool({
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
      }),

      getActiveIncidents: tool({
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
                where: { isActive: true },
                select: {
                  alertType: true,
                  action: true,
                  threshold: true,
                  triggeredAt: true,
                },
                take: 3,
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
                action: w.action,
                threshold: w.threshold,
                triggeredAt: w.triggeredAt?.toISOString() ?? null,
              })),
              hasActiveIssues: incidents.length > 0 || weatherAlerts.length > 0,
            }
          } catch (e) {
            console.error("[getActiveIncidents] Error:", e)
            return { incidents: [], weatherAlerts: [], hasActiveIssues: false }
          }
        },
      }),

      checkWaitingList: tool({
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
      }),
    },

    onFinish: async ({ text }) => {
      try {
        const defaultCategory = await prisma.queryCategory.findFirst()
        if (defaultCategory) {
          const query = await prisma.query.create({
            data: {
              guestInput: userQuery,
              categoryId: defaultCategory.id,
              channel: "WEB_RAG",
              status: lastSearchTopScore > 0 ? "RESOLVED" : "OPEN",
              confidenceScore: lastSearchTopScore,
              resolvedBy: session.user?.id,
            },
          })
          await prisma.queryResolution.create({
            data: {
              queryId: query.id,
              responseText: text,
              source: "AI",
            },
          })
        }
      } catch (e) {
        console.error("[atc/chat] Trazabilidad error:", e)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
