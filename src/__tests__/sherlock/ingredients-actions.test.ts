import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const mockRequirePermission = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockRevalidatePath    = vi.hoisted(() => vi.fn())
const mockIngredientParse   = vi.hoisted(() => vi.fn().mockImplementation((data) => data))

const mockFindMany   = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockCreate     = vi.hoisted(() => vi.fn())
const mockUpdate     = vi.hoisted(() => vi.fn())
const mockDelete     = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredient: {
      findMany:   mockFindMany,
      findUnique: mockFindUnique,
      create:     mockCreate,
      update:     mockUpdate,
      delete:     mockDelete,
    },
  },
}))

vi.mock("@/lib/actions/rbac", () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/modules/sherlock/schemas", () => ({
  ingredientSchema: {
    parse: mockIngredientParse,
  },
}))

import {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "@/modules/sherlock/actions/ingredients"

// --- Fixtures ---
const mockIngredient = {
  id: "ing-1",
  name: "Tomate",
  categoryId: "cat-1",
  unitTypeId: "unit-1",
  supplierId: "sup-1",
  category: { name: "Verduras" },
  unitType: { name: "Kilogramo", abbreviation: "kg" },
  supplier: { name: "Proveedor SL" },
}

const validData = {
  name: "Tomate",
  categoryId: "cat-1",
  unitTypeId: "unit-1",
} as any

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
  mockIngredientParse.mockImplementation((data) => data)
})

// ==================== getIngredients ====================
describe("getIngredients", () => {
  it("requiere permiso read:sherlock", async () => {
    mockFindMany.mockResolvedValue([])
    await getIngredients({})
    expect(mockRequirePermission).toHaveBeenCalledWith("sherlock", "read")
  })

  it("sin filtros: where={} — no añade categoryId ni name", async () => {
    mockFindMany.mockResolvedValue([])
    await getIngredients({})
    const call = mockFindMany.mock.calls[0][0]
    expect(call.where).toEqual({})
    expect(call.where).not.toHaveProperty("categoryId")
    expect(call.where).not.toHaveProperty("name")
  })

  it("filtro categoryId (distinto de 'all'): where.categoryId = categoryId", async () => {
    mockFindMany.mockResolvedValue([])
    await getIngredients({ categoryId: "cat-1" })
    const call = mockFindMany.mock.calls[0][0]
    expect(call.where.categoryId).toBe("cat-1")
  })

  it("filtro categoryId='all': NO añade where.categoryId (se ignora)", async () => {
    mockFindMany.mockResolvedValue([])
    await getIngredients({ categoryId: "all" })
    const call = mockFindMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty("categoryId")
  })

  it("filtro search: where.name = { contains, mode: 'insensitive' }", async () => {
    mockFindMany.mockResolvedValue([])
    await getIngredients({ search: "tomate" })
    const call = mockFindMany.mock.calls[0][0]
    expect(call.where.name).toEqual({ contains: "tomate", mode: "insensitive" })
  })

  it("orderBy: { name: 'asc' }", async () => {
    mockFindMany.mockResolvedValue([])
    await getIngredients({})
    const call = mockFindMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ name: "asc" })
  })
})

// ==================== getIngredient ====================
describe("getIngredient", () => {
  it("requiere permiso read:sherlock", async () => {
    mockFindUnique.mockResolvedValue(mockIngredient)
    await getIngredient("ing-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("sherlock", "read")
  })

  it("findUnique con include correcto (category, unitType, supplier, priceHistory take:5)", async () => {
    mockFindUnique.mockResolvedValue(mockIngredient)
    await getIngredient("ing-1")
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "ing-1" },
      include: {
        category: true,
        unitType: true,
        supplier: true,
        priceHistory: {
          orderBy: { effectiveAt: "desc" },
          take: 5,
        },
      },
    })
  })
})

// ==================== createIngredient ====================
describe("createIngredient", () => {
  it("requiere permiso manage:sherlock", async () => {
    mockCreate.mockResolvedValue(mockIngredient)
    await createIngredient(validData)
    expect(mockRequirePermission).toHaveBeenCalledWith("sherlock", "manage")
  })

  it("llama ingredientSchema.parse con los datos de entrada", async () => {
    mockCreate.mockResolvedValue(mockIngredient)
    await createIngredient(validData)
    expect(mockIngredientParse).toHaveBeenCalledWith(validData)
  })

  it("llama prisma.ingredient.create con los datos validados", async () => {
    const parsedData = { ...validData, extra: "parsed" }
    mockIngredientParse.mockReturnValue(parsedData)
    mockCreate.mockResolvedValue(mockIngredient)
    await createIngredient(validData)
    expect(mockCreate).toHaveBeenCalledWith({ data: parsedData })
  })

  it("llama revalidatePath('/sherlock/ingredients')", async () => {
    mockCreate.mockResolvedValue(mockIngredient)
    await createIngredient(validData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sherlock/ingredients")
  })
})

// ==================== updateIngredient ====================
describe("updateIngredient", () => {
  it("requiere permiso manage:sherlock", async () => {
    mockUpdate.mockResolvedValue(mockIngredient)
    await updateIngredient("ing-1", validData)
    expect(mockRequirePermission).toHaveBeenCalledWith("sherlock", "manage")
  })

  it("llama ingredientSchema.parse con los datos de entrada", async () => {
    mockUpdate.mockResolvedValue(mockIngredient)
    await updateIngredient("ing-1", validData)
    expect(mockIngredientParse).toHaveBeenCalledWith(validData)
  })

  it("llama prisma.ingredient.update con where:{id} y datos validados", async () => {
    const parsedData = { ...validData }
    mockIngredientParse.mockReturnValue(parsedData)
    mockUpdate.mockResolvedValue(mockIngredient)
    await updateIngredient("ing-1", validData)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "ing-1" },
      data: parsedData,
    })
  })

  it("llama revalidatePath 2 veces: '/sherlock/ingredients' y '/sherlock/ingredients/ing-1/edit'", async () => {
    mockUpdate.mockResolvedValue(mockIngredient)
    await updateIngredient("ing-1", validData)
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sherlock/ingredients")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sherlock/ingredients/ing-1/edit")
  })
})

// ==================== deleteIngredient ====================
describe("deleteIngredient", () => {
  it("requiere permiso manage:sherlock", async () => {
    mockDelete.mockResolvedValue(mockIngredient)
    await deleteIngredient("ing-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("sherlock", "manage")
  })

  it("llama prisma.ingredient.delete con where:{id}", async () => {
    mockDelete.mockResolvedValue(mockIngredient)
    await deleteIngredient("ing-1")
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "ing-1" } })
  })

  it("llama revalidatePath('/sherlock/ingredients')", async () => {
    mockDelete.mockResolvedValue(mockIngredient)
    await deleteIngredient("ing-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sherlock/ingredients")
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1)
  })
})
