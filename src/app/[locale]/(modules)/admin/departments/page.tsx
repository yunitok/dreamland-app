import { Header } from "@/components/layout/header"
import { DepartmentCards } from "@/modules/admin/ui/departments/department-cards"
import { prisma } from "@/lib/prisma"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { Button } from "@/modules/shared/ui/button"
import { Link } from "@/i18n/navigation"
import { Plus } from "lucide-react"

async function getDepartmentsData() {
  const projects = await prisma.project.findMany({
    select: {
      department: true
    }
  })

  const moods = await prisma.teamMood.findMany({
    orderBy: { departmentName: "asc" }
  })

  // Count projects per department
  const deptCounts = projects.reduce((acc, p) => {
    acc[p.department] = (acc[p.department] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Map moods to departments with project counts
  return moods.map(mood => ({
    id: mood.id,
    departmentName: mood.departmentName,
    sentimentScore: mood.sentimentScore,
    dominantEmotion: mood.dominantEmotion,
    keyConcerns: mood.keyConcerns,
    projectCount: deptCounts[mood.departmentName] || 0
  }))
}

export default async function DepartmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  
  const departments = await getDepartmentsData()

  const t = await getTranslations("departments")

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="departments.title"
        descriptionKey="departments.description"
      >
        <Button size="sm" asChild>
          <Link href="?new-department=true">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">{t("createDepartment")}</span>
            <span className="md:hidden">{t("create")}</span>
          </Link>
        </Button>
      </Header>
      
      <div className="flex-1 p-4 md:p-8 space-y-8">
        <DepartmentCards departments={departments} />
      </div>
    </div>
  )
}
