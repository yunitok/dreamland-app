import { Header } from "@/components/layout/header"
import { ProjectsTable } from "@/components/projects/projects-table"
import { prisma } from "@/lib/prisma"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { Plus } from "lucide-react"

async function getProjectsData() {
  const projects = await prisma.project.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" },
    ],
  })

  // Get unique departments
  const departments = [...new Set(projects.map(p => p.department))] as string[]

  return { projects, departments }
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("projects")
  
  const { projects, departments } = await getProjectsData()

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="projects.title"
        descriptionKey="projects.headerDescription"
      >
        <Button size="sm" asChild>
            <Link href="/projects?new-project=true">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">{t("createProject")}</span>
                <span className="md:hidden">Nuevo</span>
            </Link>
        </Button>
      </Header>
      
      <div className="flex-1 p-4 md:p-8 space-y-8">
        <ProjectsTable projects={projects} departments={departments} />
      </div>
    </div>
  )
}
