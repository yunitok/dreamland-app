import { Header } from "@/components/layout/header"
import { DepartmentCards } from "@/modules/departments/ui/department-cards"
import { prisma } from "@/lib/prisma"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { Button } from "@/modules/shared/ui/button"
import { Link } from "@/i18n/navigation"
import { Plus } from "lucide-react"
import { requirePermission } from "@/lib/actions/rbac"

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
  
  // Permission check
  const { roleName } = await requirePermission('departments', 'read')
  
  // Check if user can create (manage) to show the button
  // We can use a simpler check here or the hasPermission util if we want to be strict
  // For now, let's assume if they can view they might see the button but action will fail?
  // No, better to hide button.
  // We need to check 'create' permission.
  // Since we are in RSC, we can use requiresPermission but we don't want to throw.
  // We need a non-throwing check.
  // rbac.ts has `hasPermission`.
  
  const { hasPermission } = await import("@/lib/actions/rbac")
  const canCreate = await hasPermission('departments', 'create')

  const departments = await getDepartmentsData()
  const t = await getTranslations("departments")

  return (
    <div className="flex flex-col">
      <Header 
        titleKey="departments.title"
        descriptionKey="departments.description"
      >
        {canCreate && (
          <Button size="sm" asChild>
            <Link href="?new-department=true">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">{t("createDepartment")}</span>
              <span className="md:hidden">{t("create")}</span>
            </Link>
          </Button>
        )}
      </Header>
      
      <div className="flex-1 p-4 md:p-8 space-y-8">
        <DepartmentCards departments={departments} />
      </div>
    </div>
  )
}
