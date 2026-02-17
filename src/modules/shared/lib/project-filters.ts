import { getAccessibleProjectIds } from "@/lib/actions/rbac"
import { Prisma } from "@prisma/client"

/**
 * Devuelve un filtro `where` de Prisma que restringe los proyectos
 * a los que el usuario actual tiene acceso.
 *
 * Uso:
 *   const filter = await getProjectWhereFilter()
 *   const projects = await prisma.project.findMany({ where: filter })
 */
export async function getProjectWhereFilter(): Promise<Prisma.ProjectWhereInput> {
  const projectIds = await getAccessibleProjectIds()

  // null = SUPER_ADMIN, tiene acceso a todo
  if (projectIds === null) return {}

  return {
    id: { in: projectIds }
  }
}
