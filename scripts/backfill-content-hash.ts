/**
 * Backfill: genera contentHash para entries existentes sin hash.
 *
 * Ejecutar: npx tsx scripts/backfill-content-hash.ts
 */

import "dotenv/config"
import { createHash } from "crypto"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function computeContentHash(title: string, content: string): string {
  const normalized = `${title.trim().toLowerCase()}||${content.trim().toLowerCase()}`
  return createHash("sha256").update(normalized).digest("hex")
}

async function main() {
  const entries = await prisma.knowledgeBase.findMany({
    where: { contentHash: null },
    select: { id: true, title: true, content: true },
  })

  console.log(`${entries.length} entries sin contentHash`)

  let updated = 0
  let skipped = 0

  for (const entry of entries) {
    const hash = computeContentHash(entry.title, entry.content)
    try {
      await prisma.knowledgeBase.update({
        where: { id: entry.id },
        data: { contentHash: hash },
      })
      updated++
    } catch (e) {
      // Unique constraint violation = duplicado existente
      console.log(`  Skip (duplicado): "${entry.title.slice(0, 60)}..."`)
      skipped++
    }
  }

  console.log(`\nResultado: ${updated} actualizadas, ${skipped} duplicadas detectadas`)

  if (skipped > 0) {
    console.log("\nPara eliminar duplicados, revisa manualmente en la tabla KB o usa el borrado masivo por source.")
  }
}

main()
  .catch(e => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(() => pool.end())
