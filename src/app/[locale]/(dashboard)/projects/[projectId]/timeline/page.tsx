import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TimelineView } from '@/modules/projects/components/tasks/timeline-view'
import { getSession } from '@/lib/auth'
import { UserSession } from '@/lib/permissions'

interface TimelinePageProps {
  params: Promise<{ projectId: string }>
}

export default async function TimelinePage({ params }: TimelinePageProps) {
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
    <TimelineView 
      project={project}
      statuses={statuses}
      tags={project.tags}
      users={users}
      currentUserId={currentUserId}
    />
  )
}

