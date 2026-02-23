"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission, requireAuth } from "@/lib/actions/rbac"
import { syncGstockToSherlock } from "../domain/gstock-sync/sync-orchestrator"
import type { SyncReport } from "../domain/gstock-sync/types"

export async function runGstockSync(options?: { skipKB?: boolean }): Promise<SyncReport> {
  await requirePermission("sherlock", "manage")
  return syncGstockToSherlock({ skipKB: options?.skipKB })
}

export interface ResetGstockResult {
  kbEntries: number
  recipeIngredients: number
  recipes: number
  ingredients: number
  categories: number
  recipeCategories: number
  recipeFamilies: number
  suppliers: number
  measureUnits: number
}

export async function resetGstockData(): Promise<ResetGstockResult> {
  const auth = await requireAuth()
  if (!auth.authenticated || auth.roleCode !== "SUPER_ADMIN") {
    throw new Error("Solo SUPER_ADMIN puede borrar datos de GStock")
  }

  // Obtener IDs de ingredientes GStock (FK a categorías/unidades/proveedores)
  const gstockIngredients = await prisma.ingredient.findMany({
    where: { reference: { not: null } },
    select: { id: true },
  })
  const gstockIngredientIds = gstockIngredients.map(i => i.id)

  // ── Orden obligatorio por FK constraints ──────────────────────────────────
  // 1. KB entries (independientes, sin FK)
  const kbEntries = await prisma.knowledgeBase.deleteMany({ where: { source: "gstock-recipes" } })

  // 2. RecipeIngredients de ingredientes GStock en recetas NO-GStock (evitar FK violation)
  const orphanRecipeIngredients = gstockIngredientIds.length > 0
    ? await prisma.recipeIngredient.deleteMany({ where: { ingredientId: { in: gstockIngredientIds } } })
    : { count: 0 }

  // 3. Recetas GStock (cascade borra sus RecipeIngredients automáticamente)
  const recipes = await prisma.recipe.deleteMany({ where: { externalSource: "gstock" } })

  // 4. Ingredientes GStock (dependen de categorías/unidades/proveedores — borrar antes que ellos)
  const ingredients = gstockIngredientIds.length > 0
    ? await prisma.ingredient.deleteMany({ where: { id: { in: gstockIngredientIds } } })
    : { count: 0 }

  // 5. Entidades de catálogo (sin dependencias tras borrar recetas e ingredientes GStock)
  const categories = await prisma.category.deleteMany({ where: { gstockId: { not: null } } })
  const recipeCategories = await prisma.recipeCategory.deleteMany({ where: { gstockId: { not: null } } })
  const recipeFamilies = await prisma.recipeFamily.deleteMany({ where: { gstockId: { not: null } } })
  const suppliers = await prisma.supplier.deleteMany({ where: { gstockId: { not: null } } })
  const measureUnits = await prisma.measureUnit.deleteMany({ where: { gstockId: { not: null } } })

  return {
    kbEntries: kbEntries.count,
    recipeIngredients: orphanRecipeIngredients.count,
    recipes: recipes.count,
    ingredients: ingredients.count,
    categories: categories.count,
    recipeCategories: recipeCategories.count,
    recipeFamilies: recipeFamilies.count,
    suppliers: suppliers.count,
    measureUnits: measureUnits.count,
  }
}

export async function getGstockSyncInfo(): Promise<{
  lastSync: Date | null
  totalEntries: number
}> {
  await requirePermission("sherlock", "read")

  const [lastEntry, totalEntries] = await Promise.all([
    prisma.knowledgeBase.findFirst({
      where: { source: "gstock-recipes" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.knowledgeBase.count({ where: { source: "gstock-recipes" } }),
  ])

  return { lastSync: lastEntry?.updatedAt ?? null, totalEntries }
}
