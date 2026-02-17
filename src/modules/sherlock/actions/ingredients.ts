"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ingredientSchema, IngredientFormValues } from "@/modules/sherlock/schemas"
import { Ingredient } from "@prisma/client"
import { requirePermission } from "@/lib/actions/rbac"

export type IngredientWithRelations = Ingredient & {
  category: { name: string }
  unitType: { name: string; abbreviation: string }
  supplier?: { name: string } | null
}

export async function getIngredients({ categoryId, search }: { categoryId?: string, search?: string }) {
  await requirePermission("sherlock", "read")
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
  await requirePermission("sherlock", "read")
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
  await requirePermission("sherlock", "manage")
  const validatedFields = ingredientSchema.parse(data)

  await prisma.ingredient.create({ 
    data: validatedFields 
  })
  
  revalidatePath('/sherlock/ingredients')
}

export async function updateIngredient(id: string, data: IngredientFormValues) {
  await requirePermission("sherlock", "manage")
  const validatedFields = ingredientSchema.parse(data)

  await prisma.ingredient.update({
    where: { id },
    data: validatedFields
  })

  revalidatePath('/sherlock/ingredients')
  revalidatePath(`/sherlock/ingredients/${id}/edit`)
}

export async function deleteIngredient(id: string) {
  await requirePermission("sherlock", "manage")
  await prisma.ingredient.delete({
    where: { id }
  })

  revalidatePath('/sherlock/ingredients')
}
