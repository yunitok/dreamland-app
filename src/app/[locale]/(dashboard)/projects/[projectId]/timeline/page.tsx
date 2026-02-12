import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TimelineView } from '@/modules/projects/components/tasks/timeline-view'

interface TimelinePageProps {
  params: Promise<{ projectId: string }>
}

export default async function TimelinePage({ params }: TimelinePageProps) {
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
    <TimelineView 
      project={project}
      statuses={statuses}
    />
  )
}

