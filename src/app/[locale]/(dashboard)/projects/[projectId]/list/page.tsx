import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TaskListView } from '@/components/tasks/task-list-view'
import { getSession } from '@/lib/auth'
import { UserSession } from '@/lib/permissions'

interface ListPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ListPage({ params }: ListPageProps) {
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
            where: { parentId: null },
            orderBy: { position: 'asc' },
            include: {
              status: true,
              assignee: { select: { id: true, name: true, image: true } },
              tags: true,
              _count: { select: { subtasks: true, comments: true, attachments: true } },
              predecessors: true,
              successors: true,
              subtasks: {
                include: {
                  status: true,
                  assignee: { select: { id: true, name: true, image: true } },
                  tags: true,
                  _count: { select: { subtasks: true, comments: true, attachments: true } },
                  predecessors: true,
                  successors: true,
                  subtasks: { include: { status: true, assignee: true, tags: true } } // Fetch one more level just in case or empty
                },
                orderBy: { position: 'asc' }
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

  // Get all users for assignee dropdown
  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true, username: true }
  })

  return (
    <TaskListView 
      project={project}
      statuses={project.statuses}
      tags={project.tags}
      users={users}
      currentUserId={currentUserId}
    />
  )
}
