import { generateRecipeKBEntries, type RecipeForKB } from "@/modules/sherlock/domain/gstock-sync/kb-generator"

function createRecipeForKB(overrides?: Partial<RecipeForKB>): RecipeForKB {
  return {
    id: "recipe-1",
    name: "Paella Valenciana",
    description: "Receta tradicional",
    protocoloDeSala: "Servir en paellera",
    prepTime: 30,
    cookTime: 45,
    servings: 4,
    steps: ["Sofreír verduras", "Añadir arroz"],
    allergens: ["GLUTEN", "CRUSTACEOS"] as RecipeForKB["allergens"],
    photos: [],
    status: "ACTIVE",
    theoreticalCost: null,
    externalId: null,
    externalSource: null,
    yurestId: null,
    categoryId: "cat-1",
    familyId: "fam-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: "cat-1", name: "Arroces", gstockId: null, description: null, createdAt: new Date(), updatedAt: new Date() },
    family: { id: "fam-1", name: "Mediterránea", gstockId: null, description: null, createdAt: new Date(), updatedAt: new Date() },
    ingredients: [
      {
        id: "ri-1",
        recipeId: "recipe-1",
        ingredientId: "ing-1",
        unitId: "unit-1",
        quantity: 300,
        order: 0,
        ingredient: { id: "ing-1", name: "Arroz bomba", reference: null, categoryId: "cat-1", unitTypeId: "unit-1", cost: 2.5, taxRate: 0, status: "ACTIVE", currentStock: null, minStock: null, maxStock: null, description: null, yieldPercentage: 100, supplierId: null, createdAt: new Date(), updatedAt: new Date() },
        unit: { id: "unit-1", name: "gramos", abbreviation: "g", type: "WEIGHT", gstockId: null, conversionFactor: null, isBase: false, createdAt: new Date(), updatedAt: new Date() },
      },
    ],
    ...overrides,
  } as RecipeForKB
}

describe("generateRecipeKBEntries", () => {
  it("retorna array vacío para lista vacía", () => {
    expect(generateRecipeKBEntries([])).toEqual([])
  })

  it("genera 2 entries por receta (recipe + allergen)", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const perRecipe = entries.filter(e => e.title.startsWith("Receta:") || e.title.startsWith("Alérgenos:"))
    expect(perRecipe.length).toBeGreaterThanOrEqual(2)
  })

  it("genera entry de receta con título correcto", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title === "Receta: Paella Valenciana")
    expect(recipeEntry).toBeDefined()
    expect(recipeEntry!.section).toBe("Recetas")
    expect(recipeEntry!.source).toBe("gstock-recipes")
  })

  it("incluye categoría en el contenido", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("Arroces")
  })

  it("incluye familia si existe", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("Mediterránea")
  })

  it("incluye ingredientes formateados", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("Arroz bomba (300g)")
  })

  it("muestra 'sin ingredientes registrados' cuando no hay ingredientes", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB({ ingredients: [] } as any)])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("sin ingredientes registrados")
  })

  it("incluye alérgenos formateados", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("gluten")
    expect(recipeEntry.content).toContain("crustáceos")
  })

  it("muestra 'ninguno declarado' sin alérgenos", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB({ allergens: [] } as any)])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("ninguno declarado")
  })

  it("incluye pasos de elaboración", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("Sofreír verduras")
  })

  it("incluye protocolo de sala", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.content).toContain("Servir en paellera")
  })

  it("genera entry de alérgenos con título correcto", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const allergenEntry = entries.find(e => e.title === "Alérgenos: Paella Valenciana")
    expect(allergenEntry).toBeDefined()
    expect(allergenEntry!.section).toBe("Alérgenos")
  })

  it("genera entry de alérgenos para receta sin alérgenos", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB({ allergens: [] } as any)])
    const allergenEntry = entries.find(e => e.title.startsWith("Alérgenos:"))!
    expect(allergenEntry.content).toContain("no contiene alérgenos declarados")
  })

  it("genera summaries de alérgenos (con/sin)", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const withGluten = entries.find(e => e.title === "Listado de platos con gluten")
    const withoutGluten = entries.find(e => e.title === "Listado de platos sin gluten")
    // Debería haber al menos summaries para alérgenos presentes
    expect(withGluten || withoutGluten).toBeDefined()
  })

  it("categoryId del entry es el nombre de la categoría", () => {
    const entries = generateRecipeKBEntries([createRecipeForKB()])
    const recipeEntry = entries.find(e => e.title.startsWith("Receta:"))!
    expect(recipeEntry.categoryId).toBe("Arroces")
  })
})
