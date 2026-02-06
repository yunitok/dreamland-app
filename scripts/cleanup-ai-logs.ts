#!/usr/bin/env npx tsx
/**
 * Cleanup script for AiUsageLog table
 * Removes old log entries to prevent table bloat
 * 
 * Usage: npx tsx scripts/cleanup-ai-logs.ts [--days=30] [--dry-run]
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CleanupOptions {
  daysToKeep: number
  dryRun: boolean
}

function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2)
  let daysToKeep = 30
  let dryRun = false

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      daysToKeep = parseInt(arg.split('=')[1], 10)
    }
    if (arg === '--dry-run') {
      dryRun = true
    }
  }

  return { daysToKeep, dryRun }
}

async function main() {
  const { daysToKeep, dryRun } = parseArgs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  console.log(`🧹 AI Usage Log Cleanup Script`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Days to keep: ${daysToKeep}`)
  console.log(`  Cutoff date:  ${cutoffDate.toISOString()}`)
  console.log(`  Dry run:      ${dryRun ? 'Yes' : 'No'}`)
  console.log('')

  try {
    // Get count of records to delete
    const countToDelete = await prisma.aiUsageLog.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    const totalCount = await prisma.aiUsageLog.count()

    console.log(`📊 Statistics:`)
    console.log(`  Total records:     ${totalCount}`)
    console.log(`  Records to delete: ${countToDelete}`)
    console.log(`  Records to keep:   ${totalCount - countToDelete}`)
    console.log('')

    if (countToDelete === 0) {
      console.log('✅ No records to delete. Table is clean!')
      return
    }

    if (dryRun) {
      console.log('🔍 DRY RUN - No changes made.')
      console.log(`   Would delete ${countToDelete} records.`)
      return
    }

    // Actually delete
    console.log('🗑️  Deleting old records...')
    const result = await prisma.aiUsageLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    console.log(`✅ Deleted ${result.count} records successfully!`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
