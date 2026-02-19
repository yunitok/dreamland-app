import { streamText, stepCountIs } from "ai"
import { getChatLanguageModel } from "@/lib/ai/config"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import {
  extractTextContent,
  createSearchKnowledgeBaseTool,
  createLookupReservationTool,
  createGetActiveIncidentsTool,
  createCheckWaitingListTool,
} from "./tools"
import type { IncomingMessage } from "./tools"

export const maxDuration = 60

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
  const scoreRef = { value: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = streamText({
    model: getChatLanguageModel(),
    temperature: 0.1,
    maxOutputTokens: 600,
    stopWhen: stepCountIs(5),
    system: SYSTEM_PROMPT,
    messages: history as any,
    tools: {
      searchKnowledgeBase: createSearchKnowledgeBaseTool(categoryId, scoreRef),
      lookupReservation: createLookupReservationTool(),
      getActiveIncidents: createGetActiveIncidentsTool(),
      checkWaitingList: createCheckWaitingListTool(),
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
              status: scoreRef.value > 0 ? "RESOLVED" : "OPEN",
              confidenceScore: scoreRef.value,
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
