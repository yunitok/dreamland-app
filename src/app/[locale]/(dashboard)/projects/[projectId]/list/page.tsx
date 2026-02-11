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

  // Fetch global statuses (shared across all projects)
  const startStatuses = performance.now()
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { position: 'asc' }
  })
  console.log(`[PERF] fetch-statuses: ${(performance.now() - startStatuses).toFixed(2)}ms`)

  const startProject = performance.now()
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
                  // subtasks: { include: { status: true, assignee: true, tags: true } }
                },
                orderBy: { position: 'asc' }
              }
            }
          }
        }
      }
    }
  })
  if (project) {
    // const totalTasks = project.lists.reduce((acc, list) => acc + list.tasks.length, 0)
    // console.log(`[PERF] total-tasks-payload: ${totalTasks}`)
  }

  if (!project) {
    notFound()
  }

  // Get all users for assignee dropdown
  const startUsers = performance.now()
  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true, username: true }
  })
  console.log(`[PERF] fetch-users: ${(performance.now() - startUsers).toFixed(2)}ms`)

  return (
    <TaskListView 
      project={project}
      statuses={statuses}
      tags={project.tags}
      users={users}
      currentUserId={currentUserId}
    />
  )
}

