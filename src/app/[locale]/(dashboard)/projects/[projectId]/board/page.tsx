import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { getSession } from '@/lib/auth'
import { UserSession } from '@/lib/permissions'

interface BoardPageProps {
  params: Promise<{ projectId: string }>
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { projectId } = await params
  const session = await getSession() as UserSession | null
  const currentUserId = session?.user?.id || ''

  // Fetch global statuses (shared across all projects)
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { position: 'asc' }
  })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tags: true,
      lists: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            where: { parentId: null },
            orderBy: { position: 'asc' },
            include: {
              status: true,
              assignee: { select: { id: true, name: true, image: true } },
              tags: true,
              _count: { select: { subtasks: true, comments: true, attachments: true } },
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
    <KanbanBoard 
      project={project}
      statuses={statuses}
      tags={project.tags}
      users={users}
      currentUserId={currentUserId}
    />
  )
}

