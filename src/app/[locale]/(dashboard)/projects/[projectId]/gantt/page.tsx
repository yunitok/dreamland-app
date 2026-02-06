import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { GanttChart } from '@/components/tasks/gantt-chart'

interface GanttPageProps {
  params: Promise<{ projectId: string }>
}

export default async function GanttPage({ params }: GanttPageProps) {
  const { projectId } = await params

  // Fetch global statuses (shared across all projects)
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { position: 'asc' }
  })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              status: true,
              assignee: { select: { id: true, name: true, image: true } },
              predecessors: {
                include: {
                  predecessor: { select: { id: true, title: true } }
                }
              },
              successors: {
                include: {
                  successor: { select: { id: true, title: true } }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!project) {
    notFound()
  }

  return (
    <GanttChart 
      project={project}
      statuses={statuses}
    />
  )
}

