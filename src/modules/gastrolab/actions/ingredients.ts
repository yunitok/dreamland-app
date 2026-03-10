"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ingredientSchema, IngredientFormValues } from "@/modules/gastrolab/schemas"
import { Ingredient } from "@prisma/client"
import { requirePermission } from "@/lib/actions/rbac"

export type IngredientWithRelations = Ingredient & {
  category: { name: string }
  unitType: { name: string; abbreviation: string }
  supplier?: { name: string } | null
}

/** Proyección ligera para selectors de formularios (sin JOINs) */
export type IngredientSelectOption = {
  id: string
  name: string
  cost: number
  yield: number | null
}

export async function getIngredientsForSelect(): Promise<IngredientSelectOption[]> {
  await requirePermission("gastrolab", "read")
  return prisma.ingredient.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, cost: true, yield: true },
    orderBy: { name: "asc" },
  })
}

export async function getIngredients({ categoryId, search }: { categoryId?: string, search?: string }) {
  await requirePermission("gastrolab", "read")
  const where: any = {}
  
  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  return await prisma.ingredient.findMany({
    where,
    include: {
      category: true,
      unitType: true,
      supplier: true,
    },
    orderBy: { name: 'asc' }
  })
}

export async function getIngredient(id: string) {
  await requirePermission("gastrolab", "read")
  return await prisma.ingredient.findUnique({
    where: { id },
    include: {
      category: true,
      unitType: true,
      supplier: true,
      priceHistory: {
        orderBy: { effectiveAt: 'desc' },
        take: 5
      }
    }
  })
}

export async function createIngredient(data: IngredientFormValues) {
  await requirePermission("gastrolab", "manage")
  const validatedFields = ingredientSchema.parse(data)

  await prisma.ingredient.create({ 
    data: validatedFields 
  })
  
  revalidatePath('/gastrolab/ingredients')
}

export async function updateIngredient(id: string, data: IngredientFormValues) {
  await requirePermission("gastrolab", "manage")
  const validatedFields = ingredientSchema.parse(data)

  await prisma.ingredient.update({
    where: { id },
    data: validatedFields
  })

  revalidatePath('/gastrolab/ingredients')
  revalidatePath(`/gastrolab/ingredients/${id}/edit`)
}

export async function deleteIngredient(id: string) {
  await requirePermission("gastrolab", "manage")
  await prisma.ingredient.delete({
    where: { id }
  })

  revalidatePath('/gastrolab/ingredients')
}
