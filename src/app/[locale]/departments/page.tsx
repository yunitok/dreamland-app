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

  const moods = await prisma.teamMood.findMany()

  // Aggregate data
  const deptCounts = projects.reduce((acc, p) => {
    acc[p.department] = (acc[p.department] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const departments = Object.keys(deptCounts).map(name => {
    const mood = moods.find(m => m.departmentName === name)
    return {
      name,
      projectCount: deptCounts[name],
      sentimentScore: mood?.sentimentScore,
      dominantEmotion: mood?.dominantEmotion
    }
  })

  // Sort by project count descending
  return departments.sort((a, b) => b.projectCount - a.projectCount)
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
      
      <div className="flex-1 p-6">
        <DepartmentCards departments={departments} />
      </div>
    </div>
  )
}
