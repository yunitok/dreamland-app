import { AllergenType, Prisma } from "@prisma/client"
import type { BulkKBEntry } from "@/modules/atc/actions/knowledge-base-core"

// Tipo de receta con todas las relaciones necesarias para generar KB entries
export type RecipeForKB = Prisma.RecipeGetPayload<{
  include: {
    category: true
    family: true
    ingredients: {
      include: {
        ingredient: true
        unit: true
      }
      orderBy: { order: "asc" }
    }
  }
}>

const SOURCE = "gstock-recipes"

const ALLERGEN_LABELS: Record<AllergenType, string> = {
  GLUTEN: "gluten",
  CRUSTACEOS: "crustáceos",
  HUEVOS: "huevos",
  PESCADO: "pescado",
  CACAHUETES: "cacahuetes",
  SOJA: "soja",
  LACTEOS: "lácteos",
  FRUTOS_SECOS: "frutos secos",
  APIO: "apio",
  MOSTAZA: "mostaza",
  SESAMO: "sésamo",
  DIOXIDO_AZUFRE: "dióxido de azufre",
  ALTRAMUCES: "altramuces",
  MOLUSCOS: "moluscos",
}

// ─── Helpers de formato ──────────────────────────────────────────

function formatIngredientList(recipe: RecipeForKB): string {
  if (!recipe.ingredients.length) return "sin ingredientes registrados"
  return recipe.ingredients
    .map(ri => {
      const unit = ri.unit.abbreviation
      return `${ri.ingredient.name} (${ri.quantity}${unit})`
    })
    .join(", ")
}

function formatIngredientNames(recipe: RecipeForKB): string {
  if (!recipe.ingredients.length) return "sin ingredientes registrados"
  return recipe.ingredients.map(ri => ri.ingredient.name).join(", ")
}

function formatAllergens(allergens: AllergenType[]): string {
  return allergens.map(a => ALLERGEN_LABELS[a]).join(", ")
}

// ─── Generadores por entrada ─────────────────────────────────────

function buildRecipeEntry(recipe: RecipeForKB): BulkKBEntry {
  const parts: string[] = []

  const categoryPart = `Plato de la categoría ${recipe.category.name}`
  const familyPart = recipe.family ? ` · Familia: ${recipe.family.name}` : ""
  parts.push(`${categoryPart}${familyPart}.`)

  if (recipe.description) parts.push(recipe.description)
  parts.push(`Ingredientes: ${formatIngredientList(recipe)}.`)
  if (recipe.prepTime) parts.push(`Tiempo de preparación: ${recipe.prepTime} min.`)
  if (recipe.cookTime) parts.push(`Tiempo de cocción: ${recipe.cookTime} min.`)
  if (recipe.servings) parts.push(`Raciones: ${recipe.servings}.`)

  const allergenText = recipe.allergens.length
    ? formatAllergens(recipe.allergens)
    : "ninguno declarado"
  parts.push(`Alérgenos: ${allergenText}.`)

  return {
    title: `Receta: ${recipe.name}`,
    content: parts.join(" "),
    section: "Recetas",
    source: SOURCE,
  }
}

function buildAllergenEntry(recipe: RecipeForKB): BulkKBEntry {
  const ingredientNames = formatIngredientNames(recipe)

  const content = recipe.allergens.length
    ? `El ${recipe.name} contiene los siguientes alérgenos: ` +
      `${formatAllergens(recipe.allergens)}. ` +
      `Ingredientes completos: ${ingredientNames}.`
    : `El ${recipe.name} no contiene alérgenos declarados entre los 14 alérgenos de declaración obligatoria. ` +
      `Ingredientes: ${ingredientNames}.`

  return {
    title: `Alérgenos: ${recipe.name}`,
    content,
    section: "Alérgenos",
    source: SOURCE,
  }
}

function buildAllergenSummaryEntries(recipes: RecipeForKB[]): BulkKBEntry[] {
  const NOTE =
    "NOTA: esta información se basa en los ingredientes registrados. Consulta siempre con el personal de sala para confirmar."
  const entries: BulkKBEntry[] = []

  for (const allergen of Object.values(AllergenType)) {
    const label = ALLERGEN_LABELS[allergen]
    const withAllergen = recipes
      .filter(r => r.allergens.includes(allergen))
      .map(r => r.name)
    const withoutAllergen = recipes
      .filter(r => !r.allergens.includes(allergen))
      .map(r => r.name)

    if (withAllergen.length) {
      entries.push({
        title: `Listado de platos con ${label}`,
        content: `Los siguientes platos contienen ${label.toUpperCase()}: ${withAllergen.join(", ")}. ${NOTE}`,
        section: "Alérgenos",
        source: SOURCE,
      })
    }

    if (withoutAllergen.length) {
      entries.push({
        title: `Listado de platos sin ${label}`,
        content: `Los siguientes platos no contienen ${label.toUpperCase()}: ${withoutAllergen.join(", ")}. ${NOTE}`,
        section: "Alérgenos",
        source: SOURCE,
      })
    }
  }

  return entries
}

// ─── Función principal ───────────────────────────────────────────

export function generateRecipeKBEntries(recipes: RecipeForKB[]): BulkKBEntry[] {
  if (!recipes.length) return []

  const perRecipe = recipes.flatMap(recipe => [
    buildRecipeEntry(recipe),
    buildAllergenEntry(recipe),
  ])
  const summaries = buildAllergenSummaryEntries(recipes)

  return [...perRecipe, ...summaries]
}
