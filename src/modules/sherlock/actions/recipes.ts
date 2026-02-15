"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { recipeSchema, RecipeFormValues } from "../schemas"
import { Prisma } from "@prisma/client"

export type RecipeWithRelations = Prisma.RecipeGetPayload<{
  include: {
    category: true
    family: true
    ingredients: {
      include: {
        ingredient: true
      }
    }
  }
}>

export async function getRecipes() {
  return await prisma.recipe.findMany({
    include: {
      category: true,
      family: true,
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getRecipeById(id: string) {
  return await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: {
          ingredient: true,
          unit: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  })
}

export async function createRecipe(data: RecipeFormValues) {
  const validated = recipeSchema.parse(data)

  const recipe = await prisma.recipe.create({
    data: {
      name: validated.name,
      description: validated.description,
      categoryId: validated.categoryId,
      familyId: validated.familyId,
      prepTime: validated.prepTime,
      cookTime: validated.cookTime,
      servings: validated.servings,
      steps: validated.steps.map(s => s.text),
      protocoloDeSala: validated.protocoloDeSala,
      status: validated.status,
      ingredients: {
        create: validated.ingredients.map((ing, index) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitId: ing.unitId,
          notes: ing.notes,
          order: index,
        })),
      },
    },
  })

  revalidatePath('/sherlock/recipes')
  return recipe
}

export async function updateRecipe(id: string, data: RecipeFormValues) {
  const validated = recipeSchema.parse(data)

  // We delete existing ingredients and recreate them to keep it simple and ensure order
  await prisma.recipeIngredient.deleteMany({
    where: { recipeId: id },
  })

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      name: validated.name,
      description: validated.description,
      categoryId: validated.categoryId,
      familyId: validated.familyId,
      prepTime: validated.prepTime,
      cookTime: validated.cookTime,
      servings: validated.servings,
      steps: validated.steps.map(s => s.text),
      protocoloDeSala: validated.protocoloDeSala,
      status: validated.status,
      ingredients: {
        create: validated.ingredients.map((ing, index) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitId: ing.unitId,
          notes: ing.notes,
          order: index,
        })),
      },
    },
  })

  revalidatePath('/sherlock/recipes')
  revalidatePath(`/sherlock/recipes/${id}`)
  return recipe
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({
    where: { id },
  })

  revalidatePath('/sherlock/recipes')
}

export async function getRecipeCategories() {
  return await prisma.recipeCategory.findMany({ orderBy: { name: 'asc' } })
}

export async function getRecipeFamilies() {
  return await prisma.recipeFamily.findMany({ orderBy: { name: 'asc' } })
}
