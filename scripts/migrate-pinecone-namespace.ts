/**
 * Script de migracion: re-genera vectores en namespace "atc" desde la DB.
 *
 * Uso: npx tsx scripts/migrate-pinecone-namespace.ts
 *
 * Este script:
 * 1. Lee todos los KnowledgeBase entries activos de la DB
 * 2. Genera embeddings en batch
 * 3. Upsert en Pinecone con namespace "atc"
 *
 * Los vectores existentes sin namespace (default "") se quedan intactos
 * y pueden eliminarse manualmente despues de verificar.
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pinecone } from "@pinecone-database/pinecone"
import OpenAI from "openai"

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const EMBEDDING_MODEL = "openai/text-embedding-3-small"
const BATCH_SIZE = 100
const BATCH_DELAY_MS = 100
const NAMESPACE = "atc"

function buildKBText(title: string, content: string, section?: string | null): string {
  return section ? `${title} — ${section}\n\n${content}` : `${title}\n\n${content}`
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
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

async function main() {
  console.log("[migrate] Leyendo entries de la DB...")

  const entries = await prisma.knowledgeBase.findMany({
    where: { active: true },
    select: { id: true, title: true, content: true, section: true, categoryId: true, source: true, language: true },
  })

  console.log(`[migrate] ${entries.length} entries encontradas`)

  if (!entries.length) {
    console.log("[migrate] No hay entries. Nada que migrar.")
    return
  }

  console.log("[migrate] Generando embeddings en batch...")
  const texts = entries.map(e => buildKBText(e.title, e.content, e.section))
  const embeddings = await generateEmbeddingsBatch(texts)
  console.log(`[migrate] ${embeddings.length} embeddings generados`)

  console.log(`[migrate] Upserting en Pinecone namespace "${NAMESPACE}"...`)
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" })
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "dreamland-atc").namespace(NAMESPACE)

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE).map((e, j) => ({
      id: e.id,
      values: embeddings[i + j],
      metadata: {
        title: e.title,
        section: e.section ?? "",
        categoryId: e.categoryId ?? "",
        source: e.source,
        language: e.language,
        active: true,
      } as Record<string, string | number | boolean | string[]>,
    }))

    await index.upsert({ records: batch })
    console.log(`[migrate] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)} completado`)
  }

  console.log(`[migrate] Migracion completada: ${entries.length} vectores en namespace "${NAMESPACE}"`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error("[migrate] Error:", e)
  process.exit(1)
})
