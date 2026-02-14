import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { GanttChart } from '@/modules/projects/components/tasks/gantt-chart'
import { getSession } from '@/lib/auth'
import { UserSession } from '@/lib/permissions'

interface GanttPageProps {
  params: Promise<{ projectId: string }>
}

export default async function GanttPage({ params }: GanttPageProps) {
  const { projectId } = await params
  const session = await getSession() as UserSession | null
  const currentUserId = session?.user?.id || ''

  // Fetch global statuses (shared across all projects)
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { position: 'asc' }
  })

  // Fetch all users for assignee dropdown
  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true, username: true }
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
              predecessors: {
                include: {
                  predecessor: { select: { id: true, title: true } }
                }
              },
              successors: {
                include: {
                  successor: { select: { id: true, title: true } }
                }
              },
              subtasks: {
                include: {
                  status: true,
                  assignee: { select: { id: true, name: true, image: true } },
                  tags: true,
                  _count: { select: { subtasks: true, comments: true, attachments: true } },
                  predecessors: true,
                  successors: true,
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

  return (
    <GanttChart 
      project={project}
      statuses={statuses}
      tags={project.tags}
      users={users}
      currentUserId={currentUserId}
    />
  )
}

