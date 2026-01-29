import { Header } from "@/components/layout/header"
import { ProjectsTable } from "@/components/projects/projects-table"
import { prisma } from "@/lib/prisma"
import { setRequestLocale } from "next-intl/server"

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
  
  const { projects, departments } = await getProjectsData()

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="projects.title"
        descriptionKey="projects.headerDescription"
      />
      
      <div className="flex-1 p-6">
        <ProjectsTable projects={projects} departments={departments} />
      </div>
    </div>
  )
}
