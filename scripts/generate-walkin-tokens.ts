/**
 * Generate walkInToken for all RestaurantLocations that don't have one yet.
 * Run with: npx tsx scripts/generate-walkin-tokens.ts
 */
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomBytes } from "crypto"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function generateToken(): string {
  // 12-char base62 token (URL-safe, no ambiguous chars)
  const bytes = randomBytes(9) // 9 bytes = 72 bits → 12 base62 chars
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let token = ""
  for (const byte of bytes) {
    token += chars[byte % chars.length]
  }
  return token
}

async function main() {
  const locations = await prisma.restaurantLocation.findMany({
    where: { walkInToken: null },
    select: { id: true, name: true, cmSlug: true },
  })

  console.log(`Found ${locations.length} locations without walkInToken`)

  for (const loc of locations) {
    const token = generateToken()
    await prisma.restaurantLocation.update({
      where: { id: loc.id },
      data: { walkInToken: token },
    })
    console.log(`  ${loc.name} (${loc.cmSlug}) → ${token}`)
  }

  console.log("Done!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
