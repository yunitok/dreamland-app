"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { requireAuth } from "@/lib/actions/rbac"
import { getProjectWhereFilter } from "@/modules/shared/lib/project-filters"

// Types
export interface ProjectFilters {
  search?: string
  department?: string
  priority?: string
  type?: string
  status?: string
}

export interface ProjectUpdateData {
  title: string
  description: string
  department: string
  priority: string
  type: string
  status: string
  sourceQuote?: string
}

// Get all projects with optional filters (filtrados por membresía del usuario)
export async function getProjects(filters?: ProjectFilters) {
  const accessFilter = await getProjectWhereFilter()
  const where: Prisma.ProjectWhereInput = { ...accessFilter }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
    ]
  }

  if (filters?.department && filters.department !== "all") {
    where.department = filters.department
  }

  if (filters?.priority && filters.priority !== "all") {
    where.priority = filters.priority
  }

  if (filters?.type && filters.type !== "all") {
    where.type = filters.type
  }

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status
  }

  return prisma.project.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  })
}

// Get single project by ID
export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
  })
}

// Update project
export async function updateProject(id: string, data: ProjectUpdateData) {
  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        department: data.department,
        priority: data.priority,
        type: data.type,
        status: data.status,
        sourceQuote: data.sourceQuote || null,
      },
    })

    revalidatePath("/projects")
    revalidatePath("/")
    
    return { success: true, project: updated }
  } catch (error) {
    console.error("Error updating project:", error)
    return { success: false, error: "Failed to update project" }
  }
}

// Delete project
export async function deleteProject(id: string) {
  try {
    await prisma.project.delete({
      where: { id },
    })

    revalidatePath("/projects")
    revalidatePath("/")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting project:", error)
    return { success: false, error: "Failed to delete project" }
  }
}

// Create project — auto-asigna al creador como OWNER
export async function createProject(data: ProjectUpdateData) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return { success: false, error: auth.error }

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title: data.title,
          description: data.description,
          department: data.department,
          priority: data.priority,
          type: data.type,
          status: data.status,
          sourceQuote: data.sourceQuote || null,
        },
      })

      await tx.projectMember.create({
        data: { userId: auth.userId, projectId: project.id, role: 'OWNER' }
      })

      return project
    })

    revalidatePath("/projects")
    revalidatePath("/")

    return { success: true, project: created }
  } catch (error) {
    console.error("Error creating project:", error)
    return { success: false, error: "Failed to create project" }
  }
}

// Get unique departments for filters
export async function getDepartments() {
  const projects = await prisma.project.findMany({
    select: { department: true },
    distinct: ["department"],
  })
  return projects.map((p) => p.department)
}
