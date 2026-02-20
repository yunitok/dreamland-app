/**
 * Script para reorganizar las QueryCategory en la base de datos.
 *
 * - Crea las 11 categorías limpias si no existen
 * - Remapea queries y KB entries de categorías antiguas a las nuevas
 * - Elimina las categorías antiguas sobrantes
 *
 * Ejecutar: npx tsx scripts/migrate-categories.ts
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Categorías objetivo (limpias, sin solapamiento)
const TARGET_CATEGORIES = [
  { name: "Espacios",       code: "SPACES" },
  { name: "Alérgenos",      code: "ALLERGENS" },
  { name: "Accesibilidad",  code: "ACCESSIBILITY" },
  { name: "Horarios",       code: "SCHEDULES" },
  { name: "Menús",          code: "MENUS" },
  { name: "Políticas",      code: "POLICIES" },
  { name: "Reservas",       code: "RESERVATIONS" },
  { name: "Pagos",          code: "PAYMENTS" },
  { name: "Eventos",        code: "EVENTS" },
  { name: "Incidencias",    code: "INCIDENTS" },
  { name: "General",        code: "GENERAL" },
]

// Mapeo de categorías antiguas → nueva (por nombre parcial)
const REMAP: Record<string, string> = {
  "Espacios y Accesibilidad":  "Espacios",
  "Alérgenos e Ingredientes":  "Alérgenos",
  "Eventos y Celebraciones":   "Eventos",
  "Horarios y Reservas":       "Reservas",
}

async function main() {
  console.log("📦 Migrando categorías QueryCategory...\n")

  // 1. Crear las categorías objetivo que no existan
  for (const cat of TARGET_CATEGORIES) {
    await prisma.queryCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: cat,
    })
    console.log(`  ✅ ${cat.name} (${cat.code})`)
  }

  // 2. Cargar todas las categorías para obtener IDs
  const allCats = await prisma.queryCategory.findMany()
  const catByName = new Map(allCats.map(c => [c.name, c]))
  const catById = new Map(allCats.map(c => [c.id, c]))
  const targetNames = new Set(TARGET_CATEGORIES.map(c => c.name))

  // 3. Identificar categorías antiguas que necesitan remap
  const oldCats = allCats.filter(c => !targetNames.has(c.name))
  console.log(`\n🔄 Categorías antiguas a remapear: ${oldCats.length}`)

  for (const old of oldCats) {
    const newName = REMAP[old.name]
    const target = newName ? catByName.get(newName) : catByName.get("General")

    if (!target) {
      console.log(`  ⚠️  No se encontró destino para "${old.name}", asignando a General`)
      continue
    }

    console.log(`  🔀 "${old.name}" → "${target.name}"`)

    // Remapear queries
    const queryCount = await prisma.query.updateMany({
      where: { categoryId: old.id },
      data: { categoryId: target.id },
    })
    if (queryCount.count > 0) {
      console.log(`     ${queryCount.count} queries remapeadas`)
    }

    // Remapear KB entries
    const kbCount = await prisma.knowledgeBase.updateMany({
      where: { categoryId: old.id },
      data: { categoryId: target.id },
    })
    if (kbCount.count > 0) {
      console.log(`     ${kbCount.count} KB entries remapeadas`)
    }

    // Eliminar categoría antigua
    await prisma.queryCategory.delete({ where: { id: old.id } })
    console.log(`     🗑️  Eliminada`)
  }

  // 4. Resumen final
  const finalCats = await prisma.queryCategory.findMany({ orderBy: { name: "asc" } })
  console.log(`\n📋 Categorías finales (${finalCats.length}):`)
  for (const c of finalCats) {
    console.log(`  - ${c.name} (${c.code})`)
  }

  console.log("\n✅ Migración completada")
}

main()
  .catch(e => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
