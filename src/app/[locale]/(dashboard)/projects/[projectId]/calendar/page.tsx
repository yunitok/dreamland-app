import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CalendarView } from '@/components/tasks/calendar-view'
import { getSession } from '@/lib/auth'
import { UserSession } from '@/lib/permissions'

interface CalendarPageProps {
  params: Promise<{ projectId: string }>
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { projectId } = await params
  const session = await getSession() as UserSession | null
  const currentUserId = session?.user?.id || ''

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      statuses: { orderBy: { position: 'asc' } },
      tags: true,
      lists: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              status: true,
              assignee: { select: { id: true, name: true, image: true } },
              tags: true,
            }
          }
        }
      }
    }
  })

  if (!project) {
    notFound()
  }

  // Get all users for assignee dropdown
  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true, username: true }
  })

  return (
    <CalendarView 
      project={project}
      statuses={project.statuses}
      tags={project.tags}
      users={users}
      currentUserId={currentUserId}
    />
  )
}
