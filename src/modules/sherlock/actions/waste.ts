"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { wasteRecordSchema, WasteRecordFormValues } from "@/modules/sherlock/schemas"
import { WasteRecord } from "@prisma/client"
import { updateIngredientStock } from "./inventory"

export type WasteRecordWithRelations = WasteRecord & {
  ingredient: {
    name: string
    unitType: { abbreviation: string }
  }
}

export async function getWasteRecords() {
  return await prisma.wasteRecord.findMany({
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

export async function createWasteRecord(data: WasteRecordFormValues) {
  const validatedFields = wasteRecordSchema.parse(data)

  const record = await prisma.wasteRecord.create({
    data: {
      ...validatedFields,
      detectedByAI: false,
    }
  })

  await updateIngredientStock(record.ingredientId)
  
  revalidatePath('/sherlock/waste')
  revalidatePath('/sherlock/ingredients')
  return record
}

export async function deleteWasteRecord(id: string) {
  const record = await prisma.wasteRecord.delete({
    where: { id }
  })

  await updateIngredientStock(record.ingredientId)

  revalidatePath('/sherlock/waste')
  revalidatePath('/sherlock/ingredients')
}
