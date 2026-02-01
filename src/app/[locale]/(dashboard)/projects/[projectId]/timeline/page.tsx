import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TimelineView } from '@/components/tasks/timeline-view'

interface TimelinePageProps {
  params: Promise<{ projectId: string }>
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      statuses: { orderBy: { position: 'asc' } },
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
      statuses={project.statuses}
    />
  )
}
