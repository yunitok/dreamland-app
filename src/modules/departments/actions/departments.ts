"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"

// Types
export interface DepartmentData {
  departmentName: string
  sentimentScore: number
  dominantEmotion: string
  keyConcerns?: string
}

// Get all departments with project counts
export async function getDepartments() {
  // Optional: check 'read'
  // await requirePermission('departments', 'read')
  const moods = await prisma.teamMood.findMany({
    orderBy: { departmentName: "asc" }
  })
  
  const projects = await prisma.project.findMany({
    select: { department: true }
  })

  // Count projects per department
  const projectCounts = projects.reduce((acc, p) => {
    acc[p.department] = (acc[p.department] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return moods.map(mood => ({
    ...mood,
    projectCount: projectCounts[mood.departmentName] || 0
  }))
}

// Get single department by ID
export async function getDepartmentById(id: string) {
  return prisma.teamMood.findUnique({
    where: { id }
  })
}

// Create department
export async function createDepartment(data: DepartmentData) {
  await requirePermission('departments', 'create')
  try {
    const created = await prisma.teamMood.create({
      data: {
        departmentName: data.departmentName,
        sentimentScore: data.sentimentScore,
        dominantEmotion: data.dominantEmotion,
        keyConcerns: data.keyConcerns || null
      }
    })

    revalidatePath("/departments")
    revalidatePath("/")
    
    return { success: true, department: created }
  } catch (error) {
    console.error("Error creating department:", error)
    return { success: false, error: "Failed to create department" }
  }
}

// Update department
export async function updateDepartment(id: string, data: DepartmentData) {
  await requirePermission('departments', 'update')
  try {
    const updated = await prisma.teamMood.update({
      where: { id },
      data: {
        departmentName: data.departmentName,
        sentimentScore: data.sentimentScore,
        dominantEmotion: data.dominantEmotion,
        keyConcerns: data.keyConcerns || null
      }
    })

    revalidatePath("/departments")
    revalidatePath("/")
    
    return { success: true, department: updated }
  } catch (error) {
    console.error("Error updating department:", error)
    return { success: false, error: "Failed to update department" }
  }
}

// Delete department
export async function deleteDepartment(id: string) {
  await requirePermission('departments', 'delete')
  try {
    await prisma.teamMood.delete({
      where: { id }
    })

    revalidatePath("/departments")
    revalidatePath("/")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting department:", error)
    return { success: false, error: "Failed to delete department" }
  }
}
