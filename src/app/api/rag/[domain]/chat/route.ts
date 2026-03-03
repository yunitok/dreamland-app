import { streamText, stepCountIs } from "ai"
import { getChatLanguageModel } from "@/lib/ai/config"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getKBDomain, hasKBDomain } from "@/modules/rag/domain/domains"
// Asegurar que los dominios están registrados
import "@/modules/rag/domain/register-domains"
import { createSearchKnowledgeBaseTool, extractTextContent } from "./tools"
import type { IncomingMessage } from "./tools"

export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { domain: domainId } = await params

  if (!hasKBDomain(domainId)) {
    return NextResponse.json({ error: `Dominio "${domainId}" no registrado` }, { status: 404 })
  }

  const domainConfig = getKBDomain(domainId)
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

  const scoreRef = { value: 0 }

  // Construir tools: searchKnowledgeBase (común) + tools del dominio
  const tools: Record<string, ReturnType<typeof createSearchKnowledgeBaseTool>> = {
    searchKnowledgeBase: createSearchKnowledgeBaseTool(
      domainConfig.namespace,
      categoryId,
      scoreRef,
      domainConfig.hydePrompt
    ),
    ...(domainConfig.toolsFactory?.() ?? {}),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = streamText({
    model: getChatLanguageModel(),
    temperature: 0.1,
    maxOutputTokens: 600,
    stopWhen: stepCountIs(5),
    system: domainConfig.systemPrompt,
    messages: history as any,
    tools,

    onFinish: async ({ text }) => {
      if (!domainConfig.enableTracking) return
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
        console.error(`[rag/${domainId}/chat] Trazabilidad error:`, e)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
