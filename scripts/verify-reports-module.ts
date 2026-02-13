
import 'dotenv/config'
import { generateProjectReport } from '../src/modules/reports/actions/report-actions'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('--- Verifying Dedicated Reports Module ---')

  // 1. Find a project
  const project = await prisma.project.findFirst()
  if (!project) {
    console.error('❌ No projects found.')
    return
  }
  console.log(`✅ Found Project: ${project.title} (${project.id})`)

  // 2. Find a user to act as author
  const user = await prisma.user.findFirst()
  if (!user) {
      console.error('❌ No users found.')
      return
  }
  console.log(`✅ Found User: ${user.name} (${user.id})`)
  
  try {
    console.log('--- Generating Report... ---')
    // We expect this to fail with "Unauthorized" if I don't disable auth.
    const result = await generateProjectReport(project.id)
    
    console.log('✅ Action executed successfully')
    console.log(`Resource ID: ${result.id}`)
    console.log(`Redirect URL: ${result.redirectUrl}`)

    if (!result.id || !result.redirectUrl.startsWith('/reports/')) {
        console.error('❌ Invalid result format')
        return
    }

    // 3. Verify Persistence
    const savedReport = await prisma.report.findUnique({
        where: { id: result.id }
    })

    if (savedReport) {
        console.log('✅ Report persisted in Database:')
        console.log(`   Title: ${savedReport.title}`)
        console.log(`   Type: ${savedReport.type}`)
        console.log(`   Content Length: ${savedReport.content.length} chars`)
    } else {
        console.error('❌ Report NOT found in Database')
    }

  } catch (error: any) {
    console.error('❌ Verification Failed:', error.message)
  }
}

main()
