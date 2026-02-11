import 'dotenv/config'
import { generateProjectReport } from '../src/app/actions/report-actions'
import { prisma } from '../src/lib/prisma'

async function main() {
  // Find a project to test with
  const project = await prisma.project.findFirst()
  if (!project) {
    console.error('No projects found to test with.')
    return
  }

  console.log(`Testing Report Generation for Project: ${project.title} (${project.id})`)
  
  try {
    // Mock authentication if strictly required by action, but here we might hit an issue 
    // because server actions usually check headers/cookies. 
    // However, requireAuth in this codebase likely checks session which might fail in script.
    // We might need to bypass auth for this script or mock it.
    
    // Let's try running it. If it fails on auth, we'll know.
    const report = await generateProjectReport(project.id)
    
    console.log('\n--- REPORT TITLE ---')
    console.log(report.title)
    console.log('\n--- REPORT CONTENT ---')
    console.log(report.content)
    console.log('\n--- END REPORT ---')

  } catch (error) {
    console.error('Error generating report:', error)
  }
}

main()
