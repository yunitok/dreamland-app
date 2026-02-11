import { prisma } from '@/lib/prisma'
import { getChatSessions } from '@/lib/actions/chat'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProjectHeader } from '@/components/tasks/project-header'
import { ViewTabs } from '@/components/tasks/view-tabs'
import { ChatPanel } from '@/components/chat/chat-panel'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ projectId: string; locale: string }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const startLayout = performance.now()
  const { projectId, locale } = await params
  const t = await getTranslations('tasks')
  console.log(`[PERF] layout-startup: ${(performance.now() - startLayout).toFixed(2)}ms`)

  const startProjectLayout = performance.now()
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
  console.log(`[PERF] layout-fetch-project: ${(performance.now() - startProjectLayout).toFixed(2)}ms`)

  if (!project) {
    notFound()
  }

  /* Fetch Chat Sessions */
  const startChat = performance.now()
  const sessions = await getChatSessions(projectId)
  console.log(`[PERF] layout-fetch-chat: ${(performance.now() - startChat).toFixed(2)}ms`)

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
