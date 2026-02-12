import { prisma } from '@/lib/prisma'
import { getChatSessions } from '@/lib/actions/chat'
import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/modules/projects/components/tasks/project-header'
import { ViewTabs } from '@/modules/projects/components/tasks/view-tabs'
import { ChatPanel } from '@/components/chat/chat-panel'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ projectId: string; locale: string }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tags: true,
        lists: {
          orderBy: { position: 'asc' },
          select: { id: true, name: true, color: true }
        },
        _count: {
          select: { lists: true }
        }
      }
    })

  if (!project) {
    notFound()
  }

  /* Fetch Chat Sessions */
  const sessions = await getChatSessions(projectId)

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader project={project} />
      <ViewTabs projectId={projectId} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <ChatPanel projectId={projectId} initialSessions={sessions} />
    </div>
  )
}
