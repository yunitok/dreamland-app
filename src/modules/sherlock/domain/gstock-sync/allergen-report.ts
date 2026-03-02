import { AllergenType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { inferAllergensForRecipe, mergeAllergens } from "./allergen-keywords"

export interface RecipeAllergenDetail {
  id: string
  name: string
  category: string | null
  family: string | null
  declaredAllergens: AllergenType[]
  inferredAllergens: AllergenType[]
  allAllergens: AllergenType[]
  ingredientNames: string[]
}

export interface AllergenReportData {
  totalRecipes: number
  recipesWithAllergens: number
  allergenSummary: Record<AllergenType, number>
  recipes: RecipeAllergenDetail[]
}

function buildEmptyAllergenSummary(): Record<AllergenType, number> {
  const summary = {} as Record<AllergenType, number>
  for (const key of Object.values(AllergenType)) {
    summary[key] = 0
  }
  return summary
}

function buildRecipeDetail(
  recipe: Awaited<ReturnType<typeof fetchAllRecipes>>[number],
): RecipeAllergenDetail {
  const declaredAllergens = recipe.allergens
  const ingredientNames = recipe.ingredients.map((ri) => ri.ingredient.name)
  const inferred = inferAllergensForRecipe(ingredientNames)
  const inferredOnly = inferred.filter((a) => !declaredAllergens.includes(a))
  const allAllergens = mergeAllergens(declaredAllergens, inferred)

  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category?.name ?? null,
    family: recipe.family?.name ?? null,
    declaredAllergens,
    inferredAllergens: inferredOnly,
    allAllergens,
    ingredientNames,
  }
}

function buildSummary(details: RecipeAllergenDetail[]): AllergenReportData {
  const allergenSummary = buildEmptyAllergenSummary()

  for (const detail of details) {
    for (const allergen of detail.allAllergens) {
      allergenSummary[allergen]++
    }
  }

  const recipesWithAllergens = details.filter(
    (d) => d.allAllergens.length > 0,
  ).length

  return {
    totalRecipes: details.length,
    recipesWithAllergens,
    allergenSummary,
    recipes: details,
  }
}

async function fetchAllRecipes() {
  return prisma.recipe.findMany({
    include: {
      category: { select: { name: true } },
      family: { select: { name: true } },
      ingredients: {
        include: {
          ingredient: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

export async function generateAllergenReport(): Promise<AllergenReportData> {
  const recipes = await fetchAllRecipes()

  if (recipes.length === 0) {
    return {
      totalRecipes: 0,
      recipesWithAllergens: 0,
      allergenSummary: buildEmptyAllergenSummary(),
      recipes: [],
    }
  }

  const details = recipes.map(buildRecipeDetail)
  return buildSummary(details)
}
