
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const AI_VELOCITY_FACTOR = 0.5 // 1 SP = 0.5 Days
const BASE_START_DATE = new Date('2026-02-16T09:00:00') // Monday Feb 16, 2026

async function updateProjectSchedule(projectTitleOrId: string, isId: boolean = false) {
  console.log(`\n🔄 Processing Project: "${projectTitleOrId}"...`)

  const where = isId ? { id: projectTitleOrId } : { title: projectTitleOrId }
  
  const project = await prisma.project.findFirst({
    where,
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' }
          }
        }
      }
    }
  })

  if (!project) {
    console.error(`❌ Project not found: ${projectTitleOrId}`)
    return
  }

  console.log(`✅ Found Project: ${project.title} (${project.id})`)

  // Update Project Start Date
  await prisma.project.update({
    where: { id: project.id },
    data: { startDate: BASE_START_DATE }
  })

  let currentStartDate = new Date(BASE_START_DATE)

  const addWorkingDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    let added = 0
    // Treat partial days as full days for the purpose of skipping weekends, 
    // but calculating exact time might be overkill. 
    // Let's keep it simple: strict day jumping.
    // If days is 0.5, we just add 0.5 days (12 hours) but checking weekends is tricky.
    // Let's converting to hours for finer granularity.
    
    // Simplification: We work in chunks of 0.5 days (4 hours).
    // If we land on Sat/Sun, we move to Monday.
    
    const hoursToAdd = days * 8 // Assuming 8 hour work day
    
    // This is getting complex for a simple date planner.
    // Let's stick to the previous "Day" bucket logic but increment by float.
    // If we are at 0.5, we are still on the same day.
    
    // Actually, to visualize on Gantt (Task lists), we usually care about dates.
    // Let's accumulate "working days" as a float.
    
    return result
  }

  // Simpler Logic for Date Stamping:
  // We track a "cursor" date.
  // We assume 1 work day = 9:00 to 17:00.
  // We assume no weekends.
  
  // Reset cursor to 9:00 AM on Base Date
  let cursor = new Date(BASE_START_DATE)
  cursor.setHours(9, 0, 0, 0)

  for (const list of project.lists) {
    for (const task of list.tasks) {
      const sp = task.storyPoints || 1 // Default to 1 if missing
      const durDays = Math.max(0.5, sp * AI_VELOCITY_FACTOR)
      
      // Calculate Start
      // If cursor is on Sat/Sun, move to Mon
      while (cursor.getDay() === 0 || cursor.getDay() === 6) {
        cursor.setDate(cursor.getDate() + 1)
        cursor.setHours(9, 0, 0, 0)
      }
      
      const taskStart = new Date(cursor)
      
      // Calculate End by adding duration days
      // We need to handle "hopping" over weekends if duration > 1 week
      // roughly:
      let remainingDays = durDays
      let endCursor = new Date(taskStart)
      
      while (remainingDays > 0) {
        // If we are starting fresh day vs mid-day?
        // Let's keep it day-based for simplicity of Gantt.
        // Start date is Start Date.
        // End Date is Start + X working days.
        
        const dayStep = Math.min(1, remainingDays) 
        // We actually just want to find the calendar date X working days away.
        
        // Simple loop
        if (endCursor.getDay() === 0 || endCursor.getDay() === 6) {
             endCursor.setDate(endCursor.getDate() + 1)
             continue 
        }
        
        remainingDays -= 1 // consume 1 day
        endCursor.setDate(endCursor.getDate() + 1)
      }
       
      // The loop above overshoots by 1 day because it consumes the day *then* advances.
      // Correction: dueDate is usually inclusive or EOD.
      // Let's use a simpler "Add Working Days" specific function
      
      const calculateEndDate = (start: Date, workingDays: number) => {
          let current = new Date(start)
          let added = 0
          while (added < Math.ceil(workingDays)) {
              if (current.getDay() !== 0 && current.getDay() !== 6) {
                  added++
              }
              if (added < Math.ceil(workingDays)) {
                  current.setDate(current.getDate() + 1)
              }
          }
          // Set to EOD
          current.setHours(18, 0, 0, 0)
          return current
      }
      
      const taskEnd = calculateEndDate(taskStart, durDays)
      
      console.log(`  🔹 Task: ${task.title.substring(0, 30)}... [${sp} SP -> ${durDays} Days]`)
      console.log(`     📅 ${taskStart.toISOString().split('T')[0]} -> ${taskEnd.toISOString().split('T')[0]}`)

      await prisma.task.update({
        where: { id: task.id },
        data: {
          startDate: taskStart,
          dueDate: taskEnd,
          estimatedHours: sp * 4 // 4 hours per point
        }
      })

      // Move global cursor to end date for next task (Waterfall)
      // If we want parallel, we'd need list logic, but waterfall is requested/safer.
      cursor = new Date(taskEnd)
      // Advance to next morning if we finished at EOD
      cursor.setDate(cursor.getDate() + 1) 
      cursor.setHours(9, 0, 0, 0)
    }
  }
}

async function main() {
  console.log('🚀 Starting Global Schedule Update (AI Velocity Mode)...')
  console.log(`📅 Base Start Date: ${BASE_START_DATE.toDateString()}`)
  console.log(`⚡ Velocity: 1 SP = ${AI_VELOCITY_FACTOR} Days`)

  // 1. Sherlock
  await updateProjectSchedule("Sherlock: Desviación de Costes")

  // 2. Atención al Cliente (Try finding by ID first as used in seed-pilot)
  const ATC_ID = 'cml3oth0l00390suk0p5rfcl6'
  // Or find by title if ID might not exist (if seed-pilot wasn't run exactly the same)
  // Let's try ID first, if null, try title search logic inside helper?
  // Helper takes IS_ID flag.
  
  // Let's check if project exists with that ID first
  const atcById = await prisma.project.findUnique({ where: { id: ATC_ID } })
  if (atcById) {
      await updateProjectSchedule(ATC_ID, true)
  } else {
      // Fallback: Try title search (fuzzy)
      const atcByTitle = await prisma.project.findFirst({ 
          where: { title: { contains: "Atención al Cliente", mode: 'insensitive' } } 
      })
      if (atcByTitle) {
          await updateProjectSchedule(atcByTitle.title)
      } else {
          console.warn("⚠️ Could not find 'Atención al Cliente' project to update.")
      }
  }

  console.log('\n✅ Schedule Update Complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
