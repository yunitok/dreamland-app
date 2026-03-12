import { z } from "zod"
import { InventoryStatus, WasteReason } from "@prisma/client"

export const inventoryRecordSchema = z.object({
  ingredientId: z.string().min(1, "El ingrediente es obligatorio"),
  quantity: z.coerce.number().min(0, "La cantidad debe ser mayor o igual a 0"),
  location: z.string().optional().nullable(),
  restaurantLocationId: z.string().optional().nullable(),
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
  restaurantLocationId: z.string().optional().nullable(),
})

export type WasteRecordFormValues = z.infer<typeof wasteRecordSchema>
