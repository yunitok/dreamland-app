/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ───────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockRecipeSchemaParse = vi.hoisted(() => vi.fn().mockImplementation((data: any) => data))

const mockRecipe = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const mockRecipeIngredient = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}))

const mockRecipeCategory = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

const mockRecipeFamily = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/modules/gastrolab/schemas", () => ({
  recipeSchema: {
    parse: mockRecipeSchemaParse,
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: mockRecipe,
    recipeIngredient: mockRecipeIngredient,
    recipeCategory: mockRecipeCategory,
    recipeFamily: mockRecipeFamily,
  },
}))

import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeCategories,
  getRecipeFamilies,
} from "@/modules/gastrolab/actions/recipes"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_RECIPE = {
  id: "recipe-1",
  name: "Paella Valenciana",
  description: "Receta tradicional",
  categoryId: "cat-1",
  familyId: "fam-1",
  prepTime: 30,
  cookTime: 45,
  servings: 4,
  steps: ["Paso 1", "Paso 2"],
  protocoloDeSala: "Servir caliente",
  status: "ACTIVE",
  category: { id: "cat-1", name: "Arroces" },
  family: { id: "fam-1", name: "Platos principales" },
  ingredients: [],
}

const VALID_DATA = {
  name: "Paella Valenciana",
  description: "Receta tradicional",
  categoryId: "cat-1",
  familyId: "fam-1",
  prepTime: 30,
  cookTime: 45,
  servings: 4,
  steps: [{ text: "Paso 1" }, { text: "Paso 2" }],
  protocoloDeSala: "Servir caliente",
  status: "ACTIVE",
  ingredients: [
    { ingredientId: "ing-1", quantity: 500, unitId: "unit-1", notes: "" },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getRecipes", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve todas las recetas", async () => {
    mockRecipe.findMany.mockResolvedValue([MOCK_RECIPE])

    const result = await getRecipes()

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "read")
    expect(result).toEqual([MOCK_RECIPE])
  })

  it("lanza error si no tiene permiso", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(getRecipes()).rejects.toThrow("Forbidden")
  })

  it("lanza error si prisma falla", async () => {
    mockRecipe.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getRecipes()).rejects.toThrow("DB error")
  })
})

describe("getRecipeById", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve una receta por ID", async () => {
    mockRecipe.findUnique.mockResolvedValue(MOCK_RECIPE)

    const result = await getRecipeById("recipe-1")

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "read")
    expect(result).toEqual(MOCK_RECIPE)
  })

  it("devuelve null si no existe", async () => {
    mockRecipe.findUnique.mockResolvedValue(null)

    const result = await getRecipeById("xxx")

    expect(result).toBeNull()
  })
})

describe("createRecipe", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("crea una receta con ingredientes", async () => {
    mockRecipeSchemaParse.mockReturnValue(VALID_DATA)
    mockRecipe.create.mockResolvedValue(MOCK_RECIPE)

    const result = await createRecipe(VALID_DATA as any)

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "manage")
    expect(mockRecipeSchemaParse).toHaveBeenCalledWith(VALID_DATA)
    expect(mockRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Paella Valenciana",
          ingredients: {
            create: expect.arrayContaining([
              expect.objectContaining({ ingredientId: "ing-1", quantity: 500 }),
            ]),
          },
        }),
      })
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastrolab/recipes")
    expect(result).toEqual(MOCK_RECIPE)
  })

  it("lanza error si la validacion falla", async () => {
    mockRecipeSchemaParse.mockImplementationOnce(() => {
      throw new Error("Validation error")
    })

    await expect(createRecipe({} as any)).rejects.toThrow("Validation error")
  })

  it("lanza error si no tiene permiso manage", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(createRecipe(VALID_DATA as any)).rejects.toThrow("Forbidden")
  })
})

describe("updateRecipe", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("actualiza una receta eliminando ingredientes previos", async () => {
    mockRecipeSchemaParse.mockReturnValue(VALID_DATA)
    mockRecipeIngredient.deleteMany.mockResolvedValue({ count: 2 })
    mockRecipe.update.mockResolvedValue(MOCK_RECIPE)

    const result = await updateRecipe("recipe-1", VALID_DATA as any)

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "manage")
    expect(mockRecipeIngredient.deleteMany).toHaveBeenCalledWith({
      where: { recipeId: "recipe-1" },
    })
    expect(mockRecipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recipe-1" },
      })
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastrolab/recipes")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastrolab/recipes/recipe-1")
    expect(result).toEqual(MOCK_RECIPE)
  })

  it("lanza error si prisma falla", async () => {
    mockRecipeSchemaParse.mockReturnValue(VALID_DATA)
    mockRecipeIngredient.deleteMany.mockResolvedValue({ count: 0 })
    mockRecipe.update.mockRejectedValue(new Error("DB error"))

    await expect(updateRecipe("recipe-1", VALID_DATA as any)).rejects.toThrow("DB error")
  })
})

describe("deleteRecipe", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("elimina una receta", async () => {
    mockRecipe.delete.mockResolvedValue(undefined)

    await deleteRecipe("recipe-1")

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "manage")
    expect(mockRecipe.delete).toHaveBeenCalledWith({ where: { id: "recipe-1" } })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastrolab/recipes")
  })

  it("lanza error si no tiene permiso", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(deleteRecipe("recipe-1")).rejects.toThrow("Forbidden")
  })

  it("lanza error si prisma falla", async () => {
    mockRecipe.delete.mockRejectedValue(new Error("DB error"))

    await expect(deleteRecipe("recipe-1")).rejects.toThrow("DB error")
  })
})

describe("getRecipeCategories", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve categorias de recetas", async () => {
    const categories = [{ id: "cat-1", name: "Arroces" }]
    mockRecipeCategory.findMany.mockResolvedValue(categories)

    const result = await getRecipeCategories()

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "read")
    expect(result).toEqual(categories)
  })
})

describe("getRecipeFamilies", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("devuelve familias de recetas", async () => {
    const families = [{ id: "fam-1", name: "Platos principales" }]
    mockRecipeFamily.findMany.mockResolvedValue(families)

    const result = await getRecipeFamilies()

    expect(mockRequirePermission).toHaveBeenCalledWith("gastrolab", "read")
    expect(result).toEqual(families)
  })

  it("lanza error si prisma falla", async () => {
    mockRecipeFamily.findMany.mockRejectedValue(new Error("DB error"))

    await expect(getRecipeFamilies()).rejects.toThrow("DB error")
  })
})
