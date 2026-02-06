
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

// Always use DIRECT_URL for migration scripts (bypass pooler)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ ERROR: No database connection string found!')
  console.error('Please set DIRECT_URL or DATABASE_URL in your .env file')
  process.exit(1)
}

// Detect connection type
const isDirect = connectionString.includes(':5432') || connectionString.includes('compute.amazonaws.com')
const isPooler = connectionString.includes(':6543') || connectionString.includes('pgbouncer=true')

console.log('🔗 Database Connection Info:')
console.log(`   Type: ${isDirect ? '✅ DIRECT (port 5432)' : isPooler ? '⚠️ POOLER (port 6543)' : '❓ UNKNOWN'}`)
console.log(`   Using: ${process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL (fallback)'}`)

if (!isDirect) {
  console.warn('⚠️ WARNING: This script should use DIRECT_URL for reliability')
  console.warn('   Please add DIRECT_URL to your .env file')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('� Script started. Initializing...')
  console.log(`📡 Connecting to DB... (URL length: ${connectionString?.length || 0})`)

  try {
    // 1. Get the "Backlog" status ID
    console.log('🔍 Fetching "Backlog" status...')
    const backlogStatus = await prisma.taskStatus.findUnique({
      where: { name: 'Backlog' }
    })

    if (!backlogStatus) {
      console.error('❌ Error: "Backlog" status not found. Please ensure global statuses are seeded.')
      process.exit(1)
    }

    console.log(`✅ Found Backlog status ID: ${backlogStatus.id}`)

    // 2. Find tasks to update
    console.log('🔍 Finding unassigned tasks not in Backlog...')
    const tasksToUpdate = await prisma.task.findMany({
      where: {
        assigneeId: null,
        status: {
          name: { not: 'Backlog' },
          isClosed: false
        }
      },
      include: {
        status: true
      }
    })

    console.log(`� Found ${tasksToUpdate.length} unassigned tasks in non-Backlog statuses.`)

    if (tasksToUpdate.length === 0) {
      console.log('✅ No tasks need migration. Exiting.')
      return
    }

    // 3. Update tasks
    console.log('🛠 Updating tasks...')
    const updatePromises = tasksToUpdate.map(async (task) => {
      console.log(`   - Moving task "${task.title}" (ID: ${task.id}) from "${task.status.name}" to "Backlog"`)
      return prisma.task.update({
        where: { id: task.id },
        data: { statusId: backlogStatus.id }
      })
    })

    await Promise.all(updatePromises)
    console.log(`✅ Successfully moved ${tasksToUpdate.length} tasks to Backlog.`)

  } catch (error) {
    console.error('❌ An error occurred during migration:', error)
    if (error instanceof Error) {
        console.error('Error Stack:', error.stack)
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    console.log('🔌 Disconnecting...')
    await prisma.$disconnect()
    console.log('🏊 Ending Pool...')
    await pool.end()
    console.log('👋 Done. Exiting process.')
    process.exit(0)
  })
