import OpenAI from "openai"

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const HYDE_MODEL = process.env.AI_CHAT_MODEL || "google/gemini-2.0-flash-lite-001"

const EMBEDDING_MODEL = "openai/text-embedding-3-small"
const BATCH_SIZE = 100
const BATCH_DELAY_MS = 100

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  })
  return response.data[0].embedding
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, 8000))

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    })

    results.push(...response.data.map(d => d.embedding))

    if (i + BATCH_SIZE < texts.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  return results
}

export function buildKBText(title: string, content: string, section?: string | null): string {
  return section ? `${title} — ${section}\n\n${content}` : `${title}\n\n${content}`
}

/**
 * HyDE (Hypothetical Document Embeddings):
 * Genera una respuesta hipotética breve a la query del usuario usando un LLM.
 * Embeddear la respuesta hipotética (en lugar de la query) mejora el cosine
 * similarity porque el espacio semántico de la respuesta está más cerca del
 * contenido indexado que el de la pregunta informal.
 *
 * Retorna la respuesta hipotética concatenada con la query original para
 * combinar ambas señales semánticas.
 */
export async function generateHyDEQuery(userQuery: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: HYDE_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Eres un experto en restaurantes. Dado una pregunta de cliente, " +
          "genera una respuesta hipotética breve y factual (2-3 frases) como si " +
          "fueras el restaurante respondiendo. No menciones el nombre del restaurante. " +
          "Responde en español.",
      },
      { role: "user", content: userQuery },
    ],
    max_tokens: 120,
    temperature: 0.1,
  })

  const hypothetical = response.choices[0]?.message?.content?.trim() ?? ""
  // Combinar la respuesta hipotética con la query original para capturar ambas señales
  return hypothetical ? `${hypothetical}\n\n${userQuery}` : userQuery
}
