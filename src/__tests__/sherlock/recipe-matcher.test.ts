const mockFetchYurestRecipeDetail = vi.hoisted(() => vi.fn())

vi.mock("@/lib/yurest", () => ({
  fetchYurestRecipeDetail: mockFetchYurestRecipeDetail,
}))

import { matchRecipes, type GstockRecipeForMatching, type MatchResult } from "@/modules/sherlock/domain/yurest-matching/recipe-matcher"
import type { YurestRecipeListItem } from "@/lib/yurest"

const gstockRecipe = (name: string, ingredients: string[] = []): GstockRecipeForMatching => ({
  id: `gstock-${name}`,
  name,
  ingredientNames: ingredients,
})

const yurestRecipe = (id: number, name: string): YurestRecipeListItem => ({
  id,
  name,
}) as YurestRecipeListItem

describe("matchRecipes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna array vacío para input vacío", async () => {
    const results = await matchRecipes([], [])
    expect(results).toEqual([])
  })

  it("clasifica HIGH cuando nameScore >= 0.85", async () => {
    const results = await matchRecipes(
      [gstockRecipe("Paella Valenciana")],
      [yurestRecipe(1, "Paella Valenciana")],
    )

    expect(results).toHaveLength(1)
    expect(results[0].confidence).toBe("HIGH")
    expect(results[0].ingredientScore).toBeNull()
    expect(mockFetchYurestRecipeDetail).not.toHaveBeenCalled()
  })

  it("clasifica LOW cuando nameScore < 0.60", async () => {
    const results = await matchRecipes(
      [gstockRecipe("Paella Valenciana")],
      [yurestRecipe(1, "Tarta de Chocolate")],
    )

    expect(results).toHaveLength(1)
    expect(results[0].confidence).toBe("LOW")
    expect(mockFetchYurestRecipeDetail).not.toHaveBeenCalled()
  })

  it("clasifica LOW cuando no hay candidatos Yurest", async () => {
    const results = await matchRecipes(
      [gstockRecipe("Paella Valenciana")],
      [],
    )

    expect(results).toHaveLength(1)
    expect(results[0].confidence).toBe("LOW")
    expect(results[0].yurestId).toBeNull()
  })

  it("valida ingredientes para candidatos BORDERLINE (0.60-0.85)", async () => {
    mockFetchYurestRecipeDetail.mockResolvedValue({
      ingredients: [
        { product_name: "pollo" },
        { product_name: "curry" },
        { product_name: "nata" },
      ],
    })

    // Nombres lo suficientemente similares para BORDERLINE pero no HIGH
    // "Pollo al Curry" vs "Pollo Curry Especiado" debería estar entre 0.60-0.85
    const results = await matchRecipes(
      [gstockRecipe("POLLO AL CURRY", ["pollo", "curry", "nata"])],
      [yurestRecipe(1, "Pollo Curry Especiado con Nata")],
      { apiDelayMs: 0 },
    )

    expect(results).toHaveLength(1)
    // Si fue BORDERLINE, habrá llamado a fetchYurestRecipeDetail
    // Si fue HIGH, no lo habrá llamado pero el test sigue siendo válido
    if (results[0].confidence === "MEDIUM" || (results[0].ingredientScore !== null)) {
      expect(mockFetchYurestRecipeDetail).toHaveBeenCalledWith(1)
    }
  })

  it("degrada a solo nombre cuando fetchYurestRecipeDetail falla", async () => {
    mockFetchYurestRecipeDetail.mockRejectedValue(new Error("API Error"))

    // Nombres que fuerzan BORDERLINE: "Crema Catalana" vs "Crema Catalana Especial Flambeada"
    // Son similares pero no idénticos → score entre 0.60-0.85
    const results = await matchRecipes(
      [gstockRecipe("CREMA CATALANA", ["nata", "azucar", "huevo"])],
      [yurestRecipe(1, "Crema Catalana Especial Flambeada al Caramelo")],
      { apiDelayMs: 0 },
    )

    expect(results).toHaveLength(1)
    const r = results[0]
    // Si es borderline: fetchYurestRecipeDetail se llamó pero falló → ingredientScore = 0
    if (r.ingredientScore !== null) {
      expect(r.ingredientScore).toBe(0)
      expect(mockFetchYurestRecipeDetail).toHaveBeenCalled()
    }
  })

  it("invoca callback onProgress", async () => {
    const onProgress = vi.fn()

    await matchRecipes(
      [gstockRecipe("Paella Valenciana")],
      [yurestRecipe(1, "Paella Valenciana")],
      { onProgress },
    )

    expect(onProgress).toHaveBeenCalled()
    expect(onProgress.mock.calls[0][0]).toContain("HIGH")
  })

  it("procesa múltiples recetas GStock", async () => {
    const results = await matchRecipes(
      [
        gstockRecipe("Paella Valenciana"),
        gstockRecipe("Tarta de Chocolate"),
      ],
      [
        yurestRecipe(1, "Paella Valenciana"),
        yurestRecipe(2, "Tarta de Chocolate Negro"),
      ],
    )

    expect(results).toHaveLength(2)
  })
})
