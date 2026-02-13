'use server'

import { prisma } from "@/lib/prisma";
import { teamMoodSchema, TeamMoodFormData } from "@/lib/validations/sentiment";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/actions/rbac";

export async function createTeamMood(data: TeamMoodFormData) {
  await requirePermission('sentiment', 'create');
  const result = teamMoodSchema.safeParse(data);

  if (!result.success) {
    return { error: "Validation failed" };
  }

  try {
    await prisma.teamMood.create({
      data: result.data,
    });
  } catch {
    return { error: "Failed to create mood record" };
  }


  revalidatePath("/sentiment");
  revalidatePath("/sentiment/history");
  return { success: true };
}

export async function updateTeamMood(id: string, data: TeamMoodFormData) {
  await requirePermission('sentiment', 'update');
  const result = teamMoodSchema.safeParse(data);

  if (!result.success) {
    return { error: "Validation failed" };
  }

  try {
    await prisma.teamMood.update({
      where: { id },
      data: result.data,
    });
  } catch {
    return { error: "Failed to update mood record" };
  }

  revalidatePath("/sentiment");
  revalidatePath("/sentiment/history");
  return { success: true };
}

export async function deleteTeamMood(id: string) {
    await requirePermission('sentiment', 'delete');
    try {
        await prisma.teamMood.delete({
            where: { id }
        });
        revalidatePath("/sentiment");
        revalidatePath("/sentiment/history");
        return { success: true };
    } catch {
        return { error: "Failed to delete mood record" };
    }
}

export async function getTeamMoods() {
  try {
    const moods = await prisma.teamMood.findMany({
      orderBy: { detectedAt: 'desc' }
    });
    return { success: true, data: moods };
  } catch {
    return { success: false, error: "Failed to fetch moods" };
  }
}

export async function getTeamMoodById(id: string) {
  try {
    const mood = await prisma.teamMood.findUnique({
      where: { id }
    });
    if (!mood) return { success: false, error: "Mood not found" };
    return { success: true, data: mood };
  } catch {
    return { success: false, error: "Failed to fetch mood" };
  }
}

export async function getDepartments() {
  // Aggregate unique departments from both Project and TeamMood to ensure full coverage
  const [projectDepts, moodDepts] = await Promise.all([
    prisma.project.findMany({ select: { department: true }, distinct: ['department'] }),
    prisma.teamMood.findMany({ select: { departmentName: true }, distinct: ['departmentName'] })
  ]);

  const depts = new Set([
    ...projectDepts.map(p => p.department),
    ...moodDepts.map(m => m.departmentName)
  ]);

  return Array.from(depts).sort();
}
