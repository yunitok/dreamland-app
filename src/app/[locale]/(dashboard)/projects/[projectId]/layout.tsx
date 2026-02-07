import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProjectHeader } from '@/components/tasks/project-header'
import { ViewTabs } from '@/components/tasks/view-tabs'
import { VoiceAssistantButton } from '@/components/voice-assistant-button'
import { ChatPanel } from '@/components/chat/chat-panel'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ projectId: string; locale: string }>
}

import { getHistory } from '@/lib/actions/chat'

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId, locale } = await params
  const t = await getTranslations('tasks')

  const [project, history] = await Promise.all([
    prisma.project.findUnique({
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
    }),
    getHistory(projectId)
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader project={project} />
      <ViewTabs projectId={projectId} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <ChatPanel projectId={projectId} initialMessages={history} />
      {/* <VoiceAssistantButton projectId={projectId} className="fixed bottom-6 right-24 z-50 h-14 w-14" /> */}
    </div>
  )
}
