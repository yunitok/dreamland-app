import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProjectHeader } from '@/components/tasks/project-header'
import { ViewTabs } from '@/components/tasks/view-tabs'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ projectId: string; locale: string }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId, locale } = await params
  const t = await getTranslations('tasks')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      statuses: { orderBy: { position: 'asc' } },
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

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader project={project} />
      <ViewTabs projectId={projectId} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
