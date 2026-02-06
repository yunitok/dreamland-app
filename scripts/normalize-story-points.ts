
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

function findNearestFibonacci(num: number): number {
  return FIBONACCI.reduce((prev, curr) => {
    return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev)
  })
}

async function main() {
  console.log('Starting Story Points normalization...')

  const tasks = await prisma.task.findMany({
    where: {
      storyPoints: {
        not: null
      }
    },
    select: {
      id: true,
      title: true,
      storyPoints: true
    }
  })

  console.log(`Found ${tasks.length} tasks with Story Points.`)

  let updatedCount = 0

  for (const task of tasks) {
    if (task.storyPoints === null) continue

    if (!FIBONACCI.includes(task.storyPoints)) {
      const newPoints = findNearestFibonacci(task.storyPoints)
      console.log(`Updating task "${task.title}" (${task.id}): ${task.storyPoints} -> ${newPoints}`)
      
      await prisma.task.update({
        where: { id: task.id },
        data: { storyPoints: newPoints }
      })
      updatedCount++
    }
  }

  console.log(`Normalization complete. Updated ${updatedCount} tasks.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
