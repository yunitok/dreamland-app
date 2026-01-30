import { Header } from "@/components/layout/header"
import { DepartmentCards } from "@/components/departments/department-cards"
import { prisma } from "@/lib/prisma"
import { setRequestLocale } from "next-intl/server"

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

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="departments.title"
        descriptionKey="departments.description"
      />
      
      <div className="flex-1 p-4 md:p-8 space-y-8">
        <DepartmentCards departments={departments} />
      </div>
    </div>
  )
}
