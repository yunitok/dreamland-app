
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🕵️ Verificando datos del proyecto Sherlock...')

  const project = await prisma.project.findFirst({
    where: { title: "Sherlock: Desviación de Costes" },
    include: {
      lists: {
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              tags: true
            }
          }
        },
        orderBy: { position: 'asc' }
      }
    }
  })

  if (!project) {
    console.error('❌ Proyecto no encontrado!')
    return
  }

  console.log(`✅ Proyecto: ${project.title}`)
  console.log(`📅 Inicio Proyecto: ${project.startDate?.toISOString()}`)
  console.log(`📅 Fin Proyecto (Estimado): ${project.dueDate?.toISOString()}`)

  for (const list of project.lists) {
    console.log(`\n📋 Lista: ${list.name}`)
    for (const task of list.tasks) {
      console.log(`  - [${task.storyPoints} SP] ${task.title}`)
      console.log(`    📅 Inicio: ${task.startDate?.toISOString().split('T')[0]} | Fin: ${task.dueDate?.toISOString().split('T')[0]}`)
      console.log(`    🛠️ Notas: ${task.technicalNotes?.substring(0, 100)}...`)
      console.log(`    🏷️ Tags: ${task.tags.map(t => t.name).join(', ')}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
