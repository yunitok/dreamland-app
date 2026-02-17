
import { Header } from "@/components/layout/header"
import { ProjectsTable } from "@/modules/projects/components/projects/projects-table"
import { PortfolioTimeline } from "@/modules/projects/components/projects/portfolio-timeline"
import { prisma } from "@/lib/prisma"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"
import { getProjectWhereFilter } from "@/modules/shared/lib/project-filters"
import { Button } from "@/modules/shared/ui/button"
import { Link } from "@/i18n/navigation"
import { Plus, LayoutList, CalendarDays } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"

async function getProjectsData(includeTasks: boolean = false) {
  const accessFilter = await getProjectWhereFilter()

  const projects = await prisma.project.findMany({
    where: accessFilter,
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" },
    ],
    include: includeTasks ? {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              status: true,
              assignee: true
            }
          }
        }
      }
    } : undefined
  })

  // Get unique departments
  const departments = [...new Set(projects.map(p => p.department))] as string[]

  return { projects, departments }
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ view?: string; 'new-project'?: string }>
}) {
  const { locale } = await params
  const { view = 'list' } = await searchParams

  await requirePermission('projects', 'read')

  setRequestLocale(locale)
  const t = await getTranslations("projects")

  const { projects, departments } = await getProjectsData(view === 'timeline')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timelineProjects = projects as any

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="projects.title"
        descriptionKey="projects.headerDescription"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
            <Link
              href="/projects?view=list"
              className={`
                inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium transition-all
                ${view === 'list'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'}
              `}
              title={t('views.list')}
            >
              <LayoutList className="h-4 w-4 sm:mr-2" />
              <span className="hidden xs:inline">{t('views.list')}</span>
            </Link>
            <Link
              href="/projects?view=timeline"
              className={`
                inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium transition-all
                ${view === 'timeline'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'}
              `}
              title={t('views.timeline')}
            >
              <CalendarDays className="h-4 w-4 sm:mr-2" />
              <span className="hidden xs:inline">{t('views.timeline')}</span>
            </Link>
          </div>

          <Button size="sm" asChild className="h-8 sm:h-9">
            <Link href="/projects?new-project=true">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden md:inline">{t("createProject")}</span>
              <span className="md:hidden">Nuevo</span>
            </Link>
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {view === 'timeline' ? (
          <PortfolioTimeline projects={timelineProjects} />
        ) : (
          <ProjectsTable projects={projects} departments={departments} />
        )}
      </div>
    </div>
  )
}
