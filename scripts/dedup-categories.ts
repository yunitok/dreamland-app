import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Duplicados: código antiguo → código destino
const DUPES: Record<string, string> = {
  "ACCESIBILIDAD": "ACCESSIBILITY",
  "ALERGENOS":     "ALLERGENS",
  "ESPACIOS":      "SPACES",
}

async function main() {
  for (const [oldCode, newCode] of Object.entries(DUPES)) {
    const oldCat = await prisma.queryCategory.findUnique({ where: { code: oldCode } })
    const newCat = await prisma.queryCategory.findUnique({ where: { code: newCode } })
    if (!oldCat || !newCat) {
      console.log(`Skip: ${oldCode} o ${newCode} no encontrado`)
      continue
    }

    const qr = await prisma.query.updateMany({ where: { categoryId: oldCat.id }, data: { categoryId: newCat.id } })
    console.log(`${oldCode} → ${newCode}: ${qr.count} queries remapeadas`)

    const kr = await prisma.knowledgeBase.updateMany({ where: { categoryId: oldCat.id }, data: { categoryId: newCat.id } })
    console.log(`${oldCode} → ${newCode}: ${kr.count} KB entries remapeadas`)

    await prisma.queryCategory.delete({ where: { id: oldCat.id } })
    console.log(`Eliminada: ${oldCode}\n`)
  }

  const final = await prisma.queryCategory.findMany({ orderBy: { name: "asc" } })
  console.log(`\nCategorías finales (${final.length}):`)
  for (const c of final) {
    console.log(`  ${c.code.padEnd(16)} ${c.name}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => pool.end())
