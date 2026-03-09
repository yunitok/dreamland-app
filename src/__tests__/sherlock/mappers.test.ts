import {
  toStr,
  extractAbbreviation,
  mapGstockToMeasureUnit,
  mapGstockToCategory,
  mapGstockToRecipeCategory,
  mapGstockToRecipeFamily,
  mapGstockToSupplier,
  mapGstockToIngredient,
  mapGstockToRecipe,
  mapGstockRecipeIngredients,
  type GstockIdMap,
} from "@/modules/sherlock/domain/gstock-sync/mappers"
import type {
  GstockMeasureUnit,
  GstockCategory,
  GstockRecipeCategory,
  GstockRecipeFamily,
  GstockSupplier,
  GstockProduct,
  GstockRecipe,
} from "@/modules/sherlock/domain/gstock-sync/types"

describe("toStr", () => {
  it("convierte número a string", () => {
    expect(toStr(42)).toBe("42")
  })

  it("retorna string sin cambios", () => {
    expect(toStr("abc")).toBe("abc")
  })

  it("retorna undefined para null", () => {
    expect(toStr(null)).toBeUndefined()
  })

  it("retorna undefined para undefined", () => {
    expect(toStr(undefined)).toBeUndefined()
  })
})

describe("extractAbbreviation", () => {
  it("usa abbreviation si existe", () => {
    expect(extractAbbreviation({ id: 1, name: "gramos", abbreviation: "g" })).toBe("g")
  })

  it("usa abbr como fallback", () => {
    expect(extractAbbreviation({ id: 1, name: "gramos", abbr: "gr" })).toBe("gr")
  })

  it("usa symbol como fallback", () => {
    expect(extractAbbreviation({ id: 1, name: "litros", symbol: "L" })).toBe("L")
  })

  it("usa shortName como fallback", () => {
    expect(extractAbbreviation({ id: 1, name: "kilos", shortName: "kg" })).toBe("kg")
  })

  it("retorna undefined si no hay abreviatura", () => {
    expect(extractAbbreviation({ id: 1, name: "unidades" })).toBeUndefined()
  })
})

describe("mapGstockToMeasureUnit", () => {
  it("mapea datos completos correctamente", () => {
    const raw: GstockMeasureUnit = { id: 1, name: "Gramos", type: "WEIGHT", conversionFactor: 0.001, isBase: false }
    const result = mapGstockToMeasureUnit(raw, "g")
    expect(result).toEqual({
      name: "Gramos",
      abbreviation: "g",
      type: "WEIGHT",
      gstockId: "1",
      conversionFactor: 0.001,
      isBase: false,
    })
  })

  it("usa UNIT como tipo por defecto", () => {
    const raw: GstockMeasureUnit = { id: 1, name: "Unidades" }
    const result = mapGstockToMeasureUnit(raw, "u")
    expect(result.type).toBe("UNIT")
  })
})

describe("mapGstockToCategory", () => {
  it("mapea categoría sin parent", () => {
    const raw: GstockCategory = { id: 10, name: "Carnes" }
    const result = mapGstockToCategory(raw)
    expect(result.name).toBe("Carnes")
    expect(result.gstockId).toBe("10")
    expect(result).not.toHaveProperty("parentId")
  })

  it("resuelve parentId desde el mapa", () => {
    const parentIdMap: GstockIdMap = new Map([["5", "prisma-parent-id"]])
    const raw: GstockCategory = { id: 10, name: "Ternera", parentId: 5 }
    const result = mapGstockToCategory(raw, parentIdMap)
    expect(result.parentId).toBe("prisma-parent-id")
  })

  it("incluye description si existe", () => {
    const raw: GstockCategory = { id: 10, name: "Carnes", description: "Cortes de carne" }
    const result = mapGstockToCategory(raw)
    expect(result.description).toBe("Cortes de carne")
  })
})

describe("mapGstockToRecipeCategory", () => {
  it("mapea correctamente", () => {
    const raw: GstockRecipeCategory = { id: 1, name: "Entrantes", description: "Platos de entrada" }
    const result = mapGstockToRecipeCategory(raw)
    expect(result).toEqual({ name: "Entrantes", gstockId: "1", description: "Platos de entrada" })
  })
})

describe("mapGstockToRecipeFamily", () => {
  it("mapea correctamente", () => {
    const raw: GstockRecipeFamily = { id: 1, name: "Mediterránea" }
    const result = mapGstockToRecipeFamily(raw)
    expect(result).toEqual({ name: "Mediterránea", gstockId: "1" })
  })
})

describe("mapGstockToSupplier", () => {
  it("mapea datos mínimos", () => {
    const raw: GstockSupplier = { id: 1, name: "Proveedor A" }
    const result = mapGstockToSupplier(raw)
    expect(result.name).toBe("Proveedor A")
    expect(result.gstockId).toBe("1")
  })

  it("incluye campos opcionales cuando existen", () => {
    const raw: GstockSupplier = {
      id: 1, name: "Proveedor A", email: "prov@test.com", phone1: "600111222",
      CIF: "B12345678", reference: "REF-001", contactPerson: "Juan",
    }
    const result = mapGstockToSupplier(raw)
    expect(result.email).toBe("prov@test.com")
    expect(result.phone).toBe("600111222")
    expect(result.taxId).toBe("B12345678")
    expect(result.code).toBe("REF-001")
    expect(result.contactPerson).toBe("Juan")
  })

  it("omite campos undefined", () => {
    const raw: GstockSupplier = { id: 1, name: "Proveedor A" }
    const result = mapGstockToSupplier(raw)
    expect(result).not.toHaveProperty("email")
    expect(result).not.toHaveProperty("phone")
  })
})

describe("mapGstockToIngredient", () => {
  const unitMap: GstockIdMap = new Map([["10", "prisma-unit-1"]])
  const categoryMap: GstockIdMap = new Map([["20", "prisma-cat-1"]])

  it("retorna null si no hay categoryId en el mapa", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 999, measureUnitId: 10 }
    expect(mapGstockToIngredient(raw, unitMap, categoryMap)).toBeNull()
  })

  it("retorna null si no hay unitTypeId en el mapa", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 20, measureUnitId: 999 }
    expect(mapGstockToIngredient(raw, unitMap, categoryMap)).toBeNull()
  })

  it("mapea ingrediente con FKs válidas", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 20, measureUnitId: 10, measurePriceAverage: 2.5 }
    const result = mapGstockToIngredient(raw, unitMap, categoryMap)!
    expect(result.name).toBe("Arroz")
    expect(result.categoryId).toBe("prisma-cat-1")
    expect(result.unitTypeId).toBe("prisma-unit-1")
    expect(result.cost).toBe(2.5)
  })

  it("usa measurePriceLastPurchase como fallback de cost", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 20, measureUnitId: 10, measurePriceLastPurchase: 3.0 }
    const result = mapGstockToIngredient(raw, unitMap, categoryMap)!
    expect(result.cost).toBe(3.0)
  })

  it("resuelve supplierId desde enrichment", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 20, measureUnitId: 10 }
    const enrichment = {
      productSupplierMap: new Map([["1", "gstock-sup-1"]]),
      supplierMap: new Map([["gstock-sup-1", "prisma-sup-1"]]),
    }
    const result = mapGstockToIngredient(raw, unitMap, categoryMap, enrichment)!
    expect(result.supplierId).toBe("prisma-sup-1")
  })

  it("usa stock teórico si currentStock no viene", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 20, measureUnitId: 10 }
    const enrichment = { stockMap: new Map([["1", 50]]) }
    const result = mapGstockToIngredient(raw, unitMap, categoryMap, enrichment)!
    expect(result.currentStock).toBe(50)
  })

  it("mapea INACTIVE cuando active es false", () => {
    const raw: GstockProduct = { id: 1, name: "Arroz", categoryId: 20, measureUnitId: 10, active: false }
    const result = mapGstockToIngredient(raw, unitMap, categoryMap)!
    expect(result.status).toBe("INACTIVE")
  })
})

describe("mapGstockToRecipe", () => {
  const categoryMap: GstockIdMap = new Map([["5", "prisma-cat-1"]])
  const familyMap: GstockIdMap = new Map([["3", "prisma-fam-1"]])

  it("retorna null si no hay categoryId y no hay fallback", () => {
    const raw: GstockRecipe = { id: 1, name: "Receta", categoryId: 999 }
    expect(mapGstockToRecipe(raw, categoryMap, familyMap)).toBeNull()
  })

  it("usa fallback categoryId cuando no hay match", () => {
    const raw: GstockRecipe = { id: 1, name: "Receta", categoryId: 999 }
    const result = mapGstockToRecipe(raw, categoryMap, familyMap, "fallback-id")!
    expect(result.categoryId).toBe("fallback-id")
  })

  it("mapea receta con datos completos", () => {
    const raw: GstockRecipe = {
      id: 1, name: "Paella", categoryId: 5, familyId: 3,
      shortDescription: "Arroz típico", cost: 8.5, active: true,
      allergens: ["GLUTEN", "INVALID_CODE"],
    }
    const result = mapGstockToRecipe(raw, categoryMap, familyMap)!
    expect(result.name).toBe("Paella")
    expect(result.categoryId).toBe("prisma-cat-1")
    expect(result.familyId).toBe("prisma-fam-1")
    expect(result.description).toBe("Arroz típico")
    expect(result.status).toBe("ACTIVE")
    // Solo GLUTEN es válido, INVALID_CODE se filtra
    expect(result.allergens).toEqual(["GLUTEN"])
  })

  it("mapea inactive a ARCHIVED", () => {
    const raw: GstockRecipe = { id: 1, name: "Receta", categoryId: 5, active: false }
    const result = mapGstockToRecipe(raw, categoryMap, familyMap)!
    expect(result.status).toBe("ARCHIVED")
  })

  it("mapea elaborations a steps ordenados", () => {
    const raw: GstockRecipe = {
      id: 1, name: "Receta", categoryId: 5,
      elaborations: [
        { id: "e2", position: 2, description: "Segundo paso" },
        { id: "e1", position: 1, description: "Primer paso" },
      ],
    }
    const result = mapGstockToRecipe(raw, categoryMap, familyMap)!
    expect(result.steps).toEqual(["1. Primer paso", "2. Segundo paso"])
  })
})

describe("mapGstockRecipeIngredients", () => {
  const ingredientMap: GstockIdMap = new Map([["100", "prisma-ing-1"], ["200", "prisma-ing-2"]])
  const productUnitMap: GstockIdMap = new Map([["100", "prisma-unit-1"], ["200", "prisma-unit-2"]])

  it("retorna array vacío si no hay ingredientes", () => {
    const raw: GstockRecipe = { id: 1, name: "Receta" }
    expect(mapGstockRecipeIngredients(raw, ingredientMap, productUnitMap)).toEqual([])
  })

  it("omite líneas sin productId", () => {
    const raw: GstockRecipe = {
      id: 1, name: "Receta",
      ingredients: [{ quantityMeasure: 100 }],
    }
    expect(mapGstockRecipeIngredients(raw, ingredientMap, productUnitMap)).toEqual([])
  })

  it("omite líneas con productId no mapeado", () => {
    const raw: GstockRecipe = {
      id: 1, name: "Receta",
      ingredients: [{ productId: 999, quantityMeasure: 100 }],
    }
    expect(mapGstockRecipeIngredients(raw, ingredientMap, productUnitMap)).toEqual([])
  })

  it("mapea líneas válidas correctamente", () => {
    const raw: GstockRecipe = {
      id: 1, name: "Receta",
      ingredients: [
        { productId: 100, quantityMeasure: 300 },
        { productId: 200, quantityMeasure: 150 },
      ],
    }
    const result = mapGstockRecipeIngredients(raw, ingredientMap, productUnitMap)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ ingredientId: "prisma-ing-1", quantity: 300, unitId: "prisma-unit-1", order: 0 })
    expect(result[1]).toEqual({ ingredientId: "prisma-ing-2", quantity: 150, unitId: "prisma-unit-2", order: 1 })
  })

  it("usa quantity 1 por defecto si no viene quantityMeasure", () => {
    const raw: GstockRecipe = {
      id: 1, name: "Receta",
      ingredients: [{ productId: 100 }],
    }
    const result = mapGstockRecipeIngredients(raw, ingredientMap, productUnitMap)
    expect(result[0].quantity).toBe(1)
  })
})
