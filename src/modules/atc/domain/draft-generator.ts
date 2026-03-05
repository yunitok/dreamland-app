import { prisma } from "@/lib/prisma"
import { generateText } from "ai"
import { getChatLanguageModel } from "@/lib/ai/config"

// ─── Types ──────────────────────────────────────────────────

interface ToneExample {
  input: string
  output: string
}

interface GenerateDraftResult {
  draftId: string
  confidence: number
}

// ─── System Prompt ──────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Eres la agente de atención al cliente (ATC) de Restaurante Voltereta.
Respondes emails de clientes desde contacto@restaurantevoltereta.com.

REGLAS OBLIGATORIAS:
- Responde SIEMPRE en castellano
- Sé profesional pero cercana y amable
- Usa un tono cálido, nunca frío ni corporativo
- Saludo: "Buenos días/tardes" o "Hola [nombre]," según contexto
- Despedida: "Un saludo," o "Saludos cordiales," seguido de "Restaurante Voltereta"
- Sé concisa: respuestas claras y directas, sin párrafos largos
- Si el email es una reserva: confirma datos (fecha, hora, comensales, nombre)
- Si el email es una consulta: responde con la información disponible
- Si no tienes info suficiente: pide amablemente los datos que faltan
- NUNCA inventes información sobre el restaurante (horarios, menús, precios)
- Genera SOLO el cuerpo del email, sin asunto ni encabezados MIME
- El formato es HTML sencillo: usa <p>, <br>, <strong> si hace falta
- NO uses markdown, solo HTML`

// ─── Core Functions ─────────────────────────────────────────

export async function generateEmailDraft(emailInboxId: string): Promise<GenerateDraftResult> {
  // 1. Load the email + thread context
  const email = await prisma.emailInbox.findUnique({
    where: { id: emailInboxId },
    include: {
      category: { select: { name: true, slug: true } },
    },
  })
  if (!email) throw new Error("Email no encontrado")

  // Check if draft already exists
  const existingDraft = await prisma.emailReply.findFirst({
    where: { emailInboxId, isDraft: true },
  })
  if (existingDraft) throw new Error("Ya existe un borrador para este email")

  // 2. Load thread context (other emails in same thread)
  const threadEmails = email.threadId
    ? await prisma.emailInbox.findMany({
        where: { threadId: email.threadId, id: { not: email.id } },
        select: { fromEmail: true, subject: true, body: true, receivedAt: true },
        orderBy: { receivedAt: "asc" },
        take: 5,
      })
    : []

  // 3. Load tone profile
  const toneProfile = await prisma.aiToneProfile.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  })

  // 4. Load templates for this category as reference
  const templates = email.categoryId
    ? await prisma.emailTemplate.findMany({
        where: { categoryId: email.categoryId, isActive: true },
        select: { name: true, bodyHtml: true },
        take: 2,
      })
    : []

  // 5. Build prompt
  const messages = buildDraftPrompt(email, threadEmails, toneProfile, templates)

  // 6. Generate with AI SDK
  const result = await generateText({
    model: getChatLanguageModel(),
    messages,
    maxOutputTokens: 800,
    temperature: 0.4,
  })

  const draftHtml = result.text.trim()

  // 7. Persist as draft EmailReply
  const draft = await prisma.emailReply.create({
    data: {
      emailInboxId,
      replyType: "REPLY",
      toEmails: [email.fromEmail],
      ccEmails: [],
      subject: `Re: ${email.subject}`,
      bodyHtml: draftHtml,
      bodyText: stripHtml(draftHtml),
      sentAt: null,
      sentBy: null,
      isDraft: true,
      draftSource: "AI",
      draftScore: 0.8,
    },
  })

  // 8. Update EmailInbox flag
  await prisma.emailInbox.update({
    where: { id: emailInboxId },
    data: { hasDraft: true },
  })

  return { draftId: draft.id, confidence: 0.8 }
}

// ─── Prompt Builder ─────────────────────────────────────────

function buildDraftPrompt(
  email: {
    fromEmail: string
    fromName: string | null
    subject: string
    body: string
    aiSummary: string | null
    aiLabel: string | null
    category: { name: string; slug: string } | null
  },
  threadEmails: Array<{ fromEmail: string; subject: string; body: string; receivedAt: Date }>,
  toneProfile: { toneGuide: string; examples: unknown } | null,
  templates: Array<{ name: string; bodyHtml: string }>
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  // System prompt with tone guide
  let systemContent = BASE_SYSTEM_PROMPT
  if (toneProfile?.toneGuide) {
    systemContent += `\n\nGUÍA DE TONO ESPECÍFICA (extraída de respuestas reales del equipo):\n${toneProfile.toneGuide}`
  }
  if (email.category) {
    systemContent += `\n\nCATEGORÍA del email: ${email.category.name}`
  }
  if (templates.length > 0) {
    systemContent += `\n\nPLANTILLAS DE REFERENCIA para esta categoría:`
    for (const t of templates) {
      systemContent += `\n- "${t.name}": ${stripHtml(t.bodyHtml).slice(0, 200)}`
    }
  }
  messages.push({ role: "system", content: systemContent })

  // Few-shot examples from tone profile
  if (toneProfile?.examples) {
    const examples = toneProfile.examples as ToneExample[]
    for (const ex of examples.slice(0, 4)) {
      messages.push({ role: "user", content: ex.input })
      messages.push({ role: "assistant", content: ex.output })
    }
  }

  // Thread context
  if (threadEmails.length > 0) {
    const threadContext = threadEmails
      .map((e) => `[${e.receivedAt.toISOString().slice(0, 10)} - ${e.fromEmail}]\n${e.body.slice(0, 500)}`)
      .join("\n---\n")
    messages.push({
      role: "user",
      content: `CONTEXTO DEL HILO (mensajes anteriores):\n${threadContext}\n\n---\nAhora responde al ÚLTIMO mensaje:`,
    })
  }

  // Current email
  const senderName = email.fromName || email.fromEmail.split("@")[0]
  let userContent = `De: ${senderName} <${email.fromEmail}>\nAsunto: ${email.subject}\n\n${email.body}`
  if (email.aiSummary) {
    userContent += `\n\n[Resumen IA: ${email.aiSummary}]`
  }
  messages.push({ role: "user", content: userContent })

  return messages
}

// ─── Tone Extraction ────────────────────────────────────────

export async function extractToneFromEmails(): Promise<{ profileId: string; examplesCount: number }> {
  // Find emails with quoted replies (threads with responses from the team)
  const emails = await prisma.emailInbox.findMany({
    where: {
      body: { contains: "escribi" }, // "escribió" pattern in quoted replies
    },
    select: { body: true, fromEmail: true, subject: true },
    orderBy: { receivedAt: "desc" },
    take: 50,
  })

  // Parse quoted conversations to extract team responses
  const pairs: ToneExample[] = []
  const teamEmail = process.env.GMAIL_IMPERSONATE_EMAIL ?? "contacto@restaurantevoltereta.com"

  for (const email of emails) {
    const extracted = parseQuotedConversation(email.body, teamEmail)
    pairs.push(...extracted)
  }

  if (pairs.length === 0) {
    // Fallback: also check EmailReply if any exist
    const replies = await prisma.emailReply.findMany({
      where: { sentAt: { not: null }, isDraft: false },
      include: { emailInbox: { select: { body: true, fromEmail: true, subject: true } } },
      orderBy: { sentAt: "desc" },
      take: 30,
    })
    for (const reply of replies) {
      pairs.push({
        input: `De: ${reply.emailInbox.fromEmail}\nAsunto: ${reply.emailInbox.subject}\n\n${reply.emailInbox.body.slice(0, 500)}`,
        output: reply.bodyText ?? stripHtml(reply.bodyHtml),
      })
    }
  }

  // Use AI to extract a tone guide from the examples
  const bestExamples = pairs.slice(0, 20)
  let toneGuide = "Tono profesional pero cercano y amable. Saludos cálidos, respuestas concisas."

  if (bestExamples.length >= 3) {
    const examplesText = bestExamples
      .map((ex, i) => `--- Ejemplo ${i + 1} ---\nCliente: ${ex.input.slice(0, 300)}\nRespuesta: ${ex.output.slice(0, 300)}`)
      .join("\n\n")

    const analysisResult = await generateText({
      model: getChatLanguageModel(),
      messages: [
        {
          role: "system",
          content: `Eres un analista de comunicación. Analiza las siguientes respuestas de email de un equipo de atención al cliente de restaurante y extrae una guía de tono concisa (máx 500 palabras) que incluya:
- Nivel de formalidad (tuteo/usted, registro)
- Saludos y despedidas típicas
- Estructura habitual de las respuestas
- Expresiones o muletillas frecuentes
- Longitud media de las respuestas
- Cómo manejan diferentes tipos de consultas
Responde SOLO con la guía, sin preámbulos.`,
        },
        { role: "user", content: examplesText },
      ],
      maxOutputTokens: 800,
      temperature: 0.3,
    })

    toneGuide = analysisResult.text.trim()
  }

  // Save or update the tone profile
  const fewShotExamples = bestExamples.slice(0, 8)

  const existing = await prisma.aiToneProfile.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  })

  let profile
  if (existing) {
    profile = await prisma.aiToneProfile.update({
      where: { id: existing.id },
      data: {
        toneGuide,
        examples: JSON.parse(JSON.stringify(fewShotExamples)),
        version: { increment: 1 },
      },
    })
  } else {
    profile = await prisma.aiToneProfile.create({
      data: {
        name: "default",
        toneGuide,
        examples: JSON.parse(JSON.stringify(fewShotExamples)),
      },
    })
  }

  return { profileId: profile.id, examplesCount: fewShotExamples.length }
}

// ─── Helpers ────────────────────────────────────────────────

function parseQuotedConversation(body: string, teamEmail: string): ToneExample[] {
  const pairs: ToneExample[] = []
  // Split on common quote patterns
  const quotePatterns = [
    /El .+escribi[oó]:/gi,
    /On .+wrote:/gi,
    /De: .+/gi,
  ]

  const lines = body.split("\n")
  let currentSection = ""
  const sections: string[] = []

  for (const line of lines) {
    const isQuoteHeader = quotePatterns.some((p) => {
      p.lastIndex = 0
      return p.test(line)
    })
    if (isQuoteHeader && currentSection.trim()) {
      sections.push(currentSection.trim())
      currentSection = ""
    }
    currentSection += line + "\n"
  }
  if (currentSection.trim()) sections.push(currentSection.trim())

  // Try to identify team vs client sections
  // The first section (most recent) is usually from the team if it's a reply
  for (let i = 0; i < sections.length - 1; i++) {
    const current = sections[i]
    const next = sections[i + 1]
    // If current doesn't mention team email but next does, current is team response
    if (!current.toLowerCase().includes(teamEmail.split("@")[0]) && next.length > 20) {
      pairs.push({
        input: next.slice(0, 500),
        output: current.slice(0, 500),
      })
    }
  }

  return pairs
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
