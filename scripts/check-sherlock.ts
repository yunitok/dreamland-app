
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const project = await prisma.project.findFirst({
    where: { title: "Sherlock: Desviación de Costes" },
    include: {
      lists: {
        include: {
          tasks: true
        }
      }
    }
  })

  if (!project) {
    console.log("Project not found.")
  } else {
    console.log(`Project Found: ${project.title} (${project.id})`)
    console.log(`Lists: ${project.lists.length}`)
    project.lists.forEach(list => {
      console.log(`  - ${list.name}: ${list.tasks.length} tasks`)
      list.tasks.forEach(task => {
        console.log(`    * ${task.title} (${task.statusId})`)
      })
    })
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
