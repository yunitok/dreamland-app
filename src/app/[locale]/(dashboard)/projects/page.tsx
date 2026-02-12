
import { Header } from "@/components/layout/header"
import { ProjectsTable } from "@/modules/projects/components/projects/projects-table"
import { PortfolioTimeline } from "@/modules/projects/components/projects/portfolio-timeline"
import { prisma } from "@/lib/prisma"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { Button } from "@/modules/shared/ui/button"
import { Link } from "@/i18n/navigation"
import { Plus, LayoutList, CalendarDays } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"

async function getProjectsData(includeTasks: boolean = false) {
  const projects = await prisma.project.findMany({
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
  
  setRequestLocale(locale)
  const t = await getTranslations("projects")
  
  const { projects, departments } = await getProjectsData(view === 'timeline')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timelineProjects = projects as any

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <Header 
        titleKey="projects.title"
        descriptionKey="projects.headerDescription"
      >
        <div className="flex items-center gap-4">
          <div className="w-[200px] grid grid-cols-2 p-1 bg-muted/50 rounded-lg">
            <Link 
              href="/projects?view=list"
              className={`
                inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                ${view === 'list' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground'}
              `}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              {t('views.list')}
            </Link>
            <Link 
              href="/projects?view=timeline"
              className={`
                inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                ${view === 'timeline' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground'}
              `}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              {t('views.timeline')}
            </Link>
          </div>
          
          <Button size="sm" asChild>
              <Link href="/projects?new-project=true">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">{t("createProject")}</span>
                  <span className="md:hidden">Nuevo</span>
              </Link>
          </Button>
        </div>
      </Header>
      
      <div className="flex-1 p-4 md:p-8 overflow-hidden">
        {view === 'timeline' ? (
          <PortfolioTimeline projects={timelineProjects} />
        ) : (
          <ProjectsTable projects={projects} departments={departments} />
        )}
      </div>
    </div>
  )
}
