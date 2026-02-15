"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { inventoryRecordSchema, InventoryRecordFormValues } from "@/modules/sherlock/schemas"
import { InventoryRecord, InventoryStatus } from "@prisma/client"

export type InventoryRecordWithRelations = InventoryRecord & {
  ingredient: {
    name: string
    unitType: { abbreviation: string }
  }
}

export async function updateIngredientStock(ingredientId: string) {
  const [inventoryRecords, wasteRecords] = await Promise.all([
    prisma.inventoryRecord.findMany({
      where: { 
        ingredientId,
        status: { in: [InventoryStatus.AVAILABLE, InventoryStatus.RESERVED] }
      }
    }),
    prisma.wasteRecord.findMany({
      where: { ingredientId }
    })
  ])

  const totalInventory = inventoryRecords.reduce((sum, record) => sum + record.quantity, 0)
  const totalWaste = wasteRecords.reduce((sum, record) => sum + record.quantity, 0)
  const currentStock = Math.max(0, totalInventory - totalWaste)

  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { currentStock }
  })
}

export async function getInventoryRecords() {
  return await prisma.inventoryRecord.findMany({
    include: {
      ingredient: {
        include: {
          unitType: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getInventoryRecord(id: string) {
  return await prisma.inventoryRecord.findUnique({
    where: { id },
    include: {
      ingredient: true
    }
  })
}

export async function createInventoryRecord(data: InventoryRecordFormValues) {
  const validatedFields = inventoryRecordSchema.parse(data)

  const record = await prisma.inventoryRecord.create({
    data: validatedFields
  })

  await updateIngredientStock(record.ingredientId)
  
  revalidatePath('/sherlock/inventory')
  revalidatePath('/sherlock/ingredients')
  return record
}

export async function updateInventoryRecord(id: string, data: InventoryRecordFormValues) {
  const validatedFields = inventoryRecordSchema.parse(data)

  const record = await prisma.inventoryRecord.update({
    where: { id },
    data: validatedFields
  })

  await updateIngredientStock(record.ingredientId)

  revalidatePath('/sherlock/inventory')
  revalidatePath('/sherlock/ingredients')
  return record
}

export async function deleteInventoryRecord(id: string) {
  const record = await prisma.inventoryRecord.delete({
    where: { id }
  })

  await updateIngredientStock(record.ingredientId)

  revalidatePath('/sherlock/inventory')
  revalidatePath('/sherlock/ingredients')
}
