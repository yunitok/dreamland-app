import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const NORMALIZE_SYSTEM_PROMPT = `Eres un experto en gestión de bases de conocimiento para restaurantes.
Tu tarea es analizar texto en bruto (de Excel, PDF, documentos internos) y convertirlo en entradas
estructuradas para un sistema RAG de atención al cliente.

Reglas:
1. Divide el contenido en chunks de máximo 400 tokens cada uno
2. Cada chunk debe tener un título claro y descriptivo
3. Identifica la sección temática de cada chunk
4. Sugiere una categoría: "espacios", "alergenos", "accesibilidad", "horarios", "menus", "politicas", "general"
5. El contenido debe ser fluido y estar bien redactado en español
6. Elimina duplicados y consolida información redundante
7. Estima los tokens del contenido (1 token ≈ 4 caracteres)

Responde ÚNICAMENTE con un array JSON válido con este formato exacto:
[
  {
    "title": "Título descriptivo del chunk",
    "section": "Sección del documento",
    "content": "Contenido bien redactado del chunk",
    "categorySuggestion": "espacios|alergenos|accesibilidad|horarios|menus|politicas|general",
    "tokenCount": 150
  }
]`

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 })
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_CHAT_MODEL || "openai/gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: NORMALIZE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Normaliza el siguiente contenido para la base de conocimiento del restaurante:\n\n${text.slice(0, 12000)}`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? "[]"

    // Extraer JSON del response (puede venir con ```json```)
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 })
    }

    const entries = JSON.parse(jsonMatch[0])
    return NextResponse.json({ entries })
  } catch (e) {
    console.error("[normalize] Error:", e)
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 })
  }
}
