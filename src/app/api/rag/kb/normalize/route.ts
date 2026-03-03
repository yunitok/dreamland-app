import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getKBDomain, hasKBDomain } from "@/modules/rag/domain/domains"
import "@/modules/rag/domain/register-domains"

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const DEFAULT_NORMALIZE_PROMPT = `Eres un experto en gestion de bases de conocimiento.
Tu tarea es analizar texto en bruto (de Excel, PDF, documentos internos) y convertirlo en entradas
estructuradas para un sistema RAG.

Reglas:
1. Divide el contenido en chunks de maximo 400 tokens cada uno
2. Cada chunk debe tener un titulo claro y descriptivo
3. Identifica la seccion tematica de cada chunk
4. Sugiere una categoria adecuada para el contenido
5. El contenido debe ser fluido y estar bien redactado
6. Elimina duplicados y consolida informacion redundante
7. Estima los tokens del contenido (1 token ≈ 4 caracteres)
8. Si el contenido tiene versiones en multiples idiomas, genera un chunk separado por cada idioma con el campo "language" correspondiente (ej: "es", "en", "de", "fr")
9. Si detectas datos personales (emails, telefonos, nombres propios de clientes), eliminalos o reemplazalos por placeholders como [EMAIL], [TELEFONO], [NOMBRE]

Responde UNICAMENTE con un array JSON valido con este formato exacto:
[
  {
    "title": "Titulo descriptivo del chunk",
    "section": "Seccion del documento",
    "content": "Contenido bien redactado del chunk",
    "categorySuggestion": "categoria sugerida",
    "language": "es",
    "tokenCount": 150
  }
]`

const FILE_CONTEXT = `\nNota: El contenido proviene de un archivo importado (Excel, PDF o CSV). Las filas de Excel/CSV estan formateadas como "Header: valor". Para PDFs el texto es continuo. Interpreta la estructura para agrupar y categorizar correctamente el contenido.`

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { text, source, domain: domainId } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 })
  }

  // Usar prompt personalizado del dominio si existe
  let basePrompt = DEFAULT_NORMALIZE_PROMPT
  if (domainId && hasKBDomain(domainId)) {
    const domainConfig = getKBDomain(domainId)
    if (domainConfig.normalizePrompt) {
      basePrompt = domainConfig.normalizePrompt
    }
  }

  const systemPrompt = source === "excel" || source === "file"
    ? basePrompt + FILE_CONTEXT
    : basePrompt

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_CHAT_MODEL || "openai/gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Normaliza el siguiente contenido para la base de conocimiento:\n\n${text.slice(0, 15000)}`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? "[]"

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 })
    }

    const entries = JSON.parse(jsonMatch[0]).map((e: Record<string, unknown>) => ({
      ...e,
      language: e.language ?? "es",
    }))
    return NextResponse.json({ entries })
  } catch (e) {
    console.error("[rag/normalize] Error:", e)
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 })
  }
}
