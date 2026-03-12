/**
 * Mapeo automático de centros GStock → RestaurantLocation
 *
 * Llama al endpoint v1/centers de GStock, compara nombres con los locales
 * en la base de datos y asigna gstockCenterId automáticamente.
 *
 * Ejecución:
 *   npx tsx scripts/map-gstock-centers.ts              # Dry-run (solo muestra)
 *   npx tsx scripts/map-gstock-centers.ts --write       # Aplica los cambios
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { fetchGstock } from "../src/lib/gstock"

// ─── Prisma standalone ───────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── Tipos GStock ────────────────────────────────────────────
interface GstockCenter {
  id: number
  name: string
  groupId?: number
  groupName?: string
  [key: string]: unknown
}

// ─── Normalización de nombres ────────────────────────────────
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9\s]/g, "")    // solo alfanuméricos
    .replace(/\s+/g, " ")
    .trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)

  // Coincidencia exacta
  if (na === nb) return 1

  // Una contiene a la otra
  if (na.includes(nb) || nb.includes(na)) return 0.8

  // Palabras en común
  const wordsA = new Set(na.split(" "))
  const wordsB = new Set(nb.split(" "))
  const intersection = [...wordsA].filter((w) => wordsB.has(w))
  const union = new Set([...wordsA, ...wordsB])
  return intersection.length / union.size
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  const writeMode = process.argv.includes("--write")

  console.log("🔍 Obteniendo centros de GStock...")
  const response = await fetchGstock<GstockCenter>("v1/centers")
  const centers = response.data

  console.log(`   → ${centers.length} centros encontrados:\n`)
  for (const c of centers) {
    console.log(`     #${c.id}  ${c.name}${c.groupName ? `  (grupo: ${c.groupName})` : ""}`)
  }

  console.log("\n🏪 Obteniendo locales de la base de datos...")
  const locations = await prisma.restaurantLocation.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true, gstockCenterId: true },
    orderBy: { name: "asc" },
  })

  console.log(`   → ${locations.length} locales activos\n`)

  // ─── Matching ──────────────────────────────────────────────
  const matches: { locationId: string; locationName: string; centerId: number; centerName: string; score: number }[] = []
  const unmatched: typeof locations = []

  for (const loc of locations) {
    let bestMatch: GstockCenter | null = null
    let bestScore = 0

    for (const center of centers) {
      const score = Math.max(
        similarity(loc.name, center.name),
        similarity(`${loc.name} ${loc.city}`, center.name),
      )
      if (score > bestScore) {
        bestScore = score
        bestMatch = center
      }
    }

    if (bestMatch && bestScore >= 0.4) {
      matches.push({
        locationId: loc.id,
        locationName: `${loc.name} (${loc.city})`,
        centerId: bestMatch.id,
        centerName: bestMatch.name,
        score: bestScore,
      })
    } else {
      unmatched.push(loc)
    }
  }

  // ─── Resultados ────────────────────────────────────────────
  console.log("📋 Mapeo propuesto:\n")
  for (const m of matches) {
    const confidence = m.score >= 0.8 ? "✅" : m.score >= 0.6 ? "⚠️" : "❓"
    const already = locations.find((l) => l.id === m.locationId)?.gstockCenterId
    const status = already === m.centerId ? " (ya asignado)" : already ? ` (cambia de #${already})` : ""
    console.log(`  ${confidence} ${m.locationName}  →  #${m.centerId} ${m.centerName}  (score: ${m.score.toFixed(2)})${status}`)
  }

  if (unmatched.length > 0) {
    console.log("\n❌ Sin coincidencia:")
    for (const loc of unmatched) {
      console.log(`     ${loc.name} (${loc.city})`)
    }
  }

  // ─── Aplicar ───────────────────────────────────────────────
  if (writeMode) {
    console.log("\n✍️  Aplicando mapeo...")
    let updated = 0
    for (const m of matches) {
      const current = locations.find((l) => l.id === m.locationId)
      if (current?.gstockCenterId === m.centerId) {
        console.log(`   ⏭️  ${m.locationName} ya tiene #${m.centerId}`)
        continue
      }
      await prisma.restaurantLocation.update({
        where: { id: m.locationId },
        data: { gstockCenterId: m.centerId },
      })
      console.log(`   ✅ ${m.locationName} → #${m.centerId}`)
      updated++
    }
    console.log(`\n🎉 ${updated} locales actualizados`)
  } else {
    console.log("\n💡 Ejecuta con --write para aplicar los cambios")
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})
