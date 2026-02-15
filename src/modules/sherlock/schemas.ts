import { z } from "zod"
import { UnitType, InventoryStatus, WasteReason } from "@prisma/client"

export const unitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  abbreviation: z.string().min(1, "La abreviatura es obligatoria"),
  type: z.nativeEnum(UnitType),
  conversionFactor: z.coerce.number().optional(),
  isBase: z.boolean().default(false),
})

export type UnitFormValues = z.infer<typeof unitSchema>

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  parentId: z.string().optional(), // Can be null/undefined for root
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  phone: z.string().optional(),
  paymentTerms: z.string().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

export const ingredientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  reference: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  unitTypeId: z.string().min(1, "La unidad es obligatoria"),
  cost: z.coerce.number().min(0, "El coste debe ser mayor o igual a 0"),
  taxRate: z.coerce.number().min(0).max(1).default(0.10),
  isBuyable: z.boolean().default(true),
  isSellable: z.boolean().default(false),
  minStock: z.coerce.number().min(0).optional(),
  maxStock: z.coerce.number().min(0).optional(),
  idealStock: z.coerce.number().min(0).optional(),
  supplierId: z.string().optional(),
  yield: z.coerce.number().min(0).max(100).optional(),
  storageTemp: z.coerce.number().optional(),
  shelfLife: z.coerce.number().int().min(0).optional(),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>

export const recipeCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
})

export type RecipeCategoryFormValues = z.infer<typeof recipeCategorySchema>

export const recipeFamilySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
})

export type RecipeFamilyFormValues = z.infer<typeof recipeFamilySchema>

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "El ingrediente es obligatorio"),
  quantity: z.coerce.number().min(0.0001, "La cantidad debe ser mayor a 0"),
  unitId: z.string().min(1, "La unidad es obligatoria"),
  notes: z.string().optional(),
})

export const recipeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  familyId: z.string().optional().nullable(),
  prepTime: z.coerce.number().min(0).optional(),
  cookTime: z.coerce.number().min(0).optional(),
  servings: z.coerce.number().min(1).default(1),
  steps: z.array(z.object({ text: z.string() })).default([]),
  protocoloDeSala: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  ingredients: z.array(recipeIngredientSchema).min(1, "Debe tener al menos un ingrediente"),
})

export type RecipeFormValues = z.infer<typeof recipeSchema>

export const inventoryRecordSchema = z.object({
  ingredientId: z.string().min(1, "El ingrediente es obligatorio"),
  quantity: z.coerce.number().min(0, "La cantidad debe ser mayor o igual a 0"),
  location: z.string().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  productionDate: z.coerce.date().optional().nullable(),
  freezeDate: z.coerce.date().optional().nullable(),
  openDate: z.coerce.date().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  status: z.nativeEnum(InventoryStatus).default(InventoryStatus.AVAILABLE),
})

export type InventoryRecordFormValues = z.infer<typeof inventoryRecordSchema>

export const wasteRecordSchema = z.object({
  ingredientId: z.string().min(1, "El ingrediente es obligatorio"),
  quantity: z.coerce.number().min(0, "La cantidad debe ser mayor o igual a 0"),
  reason: z.nativeEnum(WasteReason),
  notes: z.string().optional(),
  responsibleUserId: z.string().optional(),
})

export type WasteRecordFormValues = z.infer<typeof wasteRecordSchema>
