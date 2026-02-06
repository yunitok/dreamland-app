/**
 * Migration Script: Story Points to Fibonacci
 * 
 * Converts all existing storyPoints values to the nearest Fibonacci number.
 * Fibonacci sequence used: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
 * 
 * Run with: npx tsx prisma/migrate-story-points.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Use DIRECT_URL for migrations (bypass pooler)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Fibonacci sequence for story points
const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

/**
 * Finds the nearest Fibonacci number for a given value
 */
function nearestFibonacci(value: number): number {
  if (value <= 0) return 0
  
  let closest = FIBONACCI[0]
  let minDiff = Math.abs(value - closest)
  
  for (const fib of FIBONACCI) {
    const diff = Math.abs(value - fib)
    if (diff < minDiff) {
      minDiff = diff
      closest = fib
    }
  }
  
  return closest
}

async function main() {
  console.log('🔄 Starting Story Points Migration to Fibonacci...\n')
  
  // Find all tasks with non-null storyPoints
  const tasks = await prisma.task.findMany({
    where: {
      storyPoints: { not: null }
    },
    select: {
      id: true,
      title: true,
      storyPoints: true
    }
  })
  
  console.log(`📋 Found ${tasks.length} tasks with story points\n`)
  
  let migratedCount = 0
  let unchangedCount = 0
  
  for (const task of tasks) {
    const currentPoints = task.storyPoints!
    const fibPoints = nearestFibonacci(currentPoints)
    
    if (currentPoints !== fibPoints) {
      await prisma.task.update({
        where: { id: task.id },
        data: { storyPoints: fibPoints }
      })
      
      console.log(`  ✅ "${task.title}": ${currentPoints} → ${fibPoints}`)
      migratedCount++
    } else {
      unchangedCount++
    }
  }
  
  console.log(`\n📊 Migration Summary:`)
  console.log(`   - Migrated: ${migratedCount} tasks`)
  console.log(`   - Unchanged: ${unchangedCount} tasks`)
  console.log(`   - Total: ${tasks.length} tasks`)
  console.log('\n✨ Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
