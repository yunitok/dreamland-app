"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { UnitType } from "@prisma/client"

// --- Measure Units ---

export async function getMeasureUnits() {
  return await prisma.measureUnit.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function createMeasureUnit(data: { name: string; abbreviation: string; type: UnitType; conversionFactor?: number; isBase?: boolean }) {
  await prisma.measureUnit.create({ data })
  revalidatePath('/sherlock/settings')
}

// --- Categories ---

export async function getCategories() {
  return await prisma.category.findMany({
    include: { parent: true, children: true },
    orderBy: { name: 'asc' }
  })
}

export async function createCategory(data: { name: string; description?: string; parentId?: string }) {
  await prisma.category.create({ data })
  revalidatePath('/sherlock/settings')
}

// --- Suppliers ---

export async function getSuppliers() {
  return await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function createSupplier(data: { 
  name: string; 
  code?: string; 
  email?: string; 
  phone?: string; 
  paymentTerms?: string 
}) {
  await prisma.supplier.create({ data })
  revalidatePath('/sherlock/settings')
}
