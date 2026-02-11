
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
// const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Fetching all projects via Prisma directly...')
    
    try {
        const projects = await prisma.project.findMany()
        
        console.log(`✅ Found ${projects.length} projects:`)
        projects.forEach(p => {
        console.log(`- [${p.id}] ${p.title} (Status: ${p.status})`)
        })

        const sherlock = projects.find(p => p.title.toLowerCase().includes('sherlock'))
        if (sherlock) {
            console.log(`\n🎉 "Sherlock" Project FOUND:`)
            console.log(JSON.stringify(sherlock, null, 2))
        } else {
            console.error('\n❌ "Sherlock" Project NOT FOUND in the list.')
        }

    } catch (error) {
        console.error('❌ Error fetching projects:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
