"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import {
  invoiceSchema,
  giftVoucherSchema,
  emailCategorySchema,
  InvoiceFormValues,
  GiftVoucherFormValues,
  EmailCategoryFormValues,
} from "@/modules/atc/domain/schemas"

// ─── Email Inbox ──────────────────────────────────────────────

interface EmailInboxFilters {
  showRead?:   boolean
  categoryId?: string
  minPriority?: number
  search?:     string
  assignedTo?: string
}

export async function getEmailInbox(filters: EmailInboxFilters = {}) {
  await requirePermission("atc", "manage")
  try {
    const where: Record<string, unknown> = {}
    if (!filters.showRead) where.isRead = false
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.minPriority) where.aiPriority = { gte: filters.minPriority }
    if (filters.assignedTo) where.assignedTo = filters.assignedTo
    if (filters.search) {
      where.OR = [
        { fromEmail: { contains: filters.search, mode: "insensitive" } },
        { fromName:  { contains: filters.search, mode: "insensitive" } },
        { subject:   { contains: filters.search, mode: "insensitive" } },
      ]
    }

    const emails = await prisma.emailInbox.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true, icon: true, slug: true } } },
      orderBy: [{ aiPriority: "desc" }, { receivedAt: "desc" }],
      take: 100,
    })
    return { success: true, data: emails }
  } catch (error) {
    console.error("Error fetching inbox:", error)
    return { success: false, error: "Error al cargar el buzón" }
  }
}

export async function markEmailRead(id: string) {
  await requirePermission("atc", "manage")
  try {
    await prisma.emailInbox.update({ where: { id }, data: { isRead: true } })
    revalidatePath("/atc/backoffice")
    return { success: true }
  } catch (error) {
    console.error("Error marking email as read:", error)
    return { success: false, error: "Error al marcar el email como leído" }
  }
}

export async function assignEmail(id: string, userId: string | null) {
  await requirePermission("atc", "manage")
  try {
    await prisma.emailInbox.update({ where: { id }, data: { assignedTo: userId } })
    revalidatePath("/atc/backoffice")
    return { success: true }
  } catch (error) {
    console.error("Error assigning email:", error)
    return { success: false, error: "Error al asignar el email" }
  }
}

export async function reclassifyEmail(id: string, categoryId: string, aiLabel: string) {
  await requirePermission("atc", "manage")
  try {
    await prisma.emailInbox.update({ where: { id }, data: { categoryId, aiLabel } })
    revalidatePath("/atc/backoffice")
    return { success: true }
  } catch (error) {
    console.error("Error reclassifying email:", error)
    return { success: false, error: "Error al reclasificar el email" }
  }
}

// ─── Email Categories ─────────────────────────────────────────

export async function getEmailCategories() {
  await requirePermission("atc", "read")
  try {
    const categories = await prisma.emailCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { emails: true } }, parent: { select: { name: true } } },
    })
    return { success: true, data: categories }
  } catch (error) {
    console.error("Error fetching email categories:", error)
    return { success: false, error: "Error al cargar las categorías" }
  }
}

export async function createEmailCategory(data: EmailCategoryFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = emailCategorySchema.parse(data)
    const category = await prisma.emailCategory.create({ data: validated })
    revalidatePath("/atc/backoffice")
    return { success: true, data: category }
  } catch (error) {
    console.error("Error creating email category:", error)
    return { success: false, error: "Error al crear la categoría" }
  }
}

export async function updateEmailCategory(id: string, data: EmailCategoryFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = emailCategorySchema.parse(data)
    const category = await prisma.emailCategory.update({ where: { id }, data: validated })
    revalidatePath("/atc/backoffice")
    return { success: true, data: category }
  } catch (error) {
    console.error("Error updating email category:", error)
    return { success: false, error: "Error al actualizar la categoría" }
  }
}

export async function deleteEmailCategory(id: string) {
  await requirePermission("atc", "manage")
  try {
    await prisma.emailCategory.update({ where: { id }, data: { isActive: false } })
    revalidatePath("/atc/backoffice")
    return { success: true }
  } catch (error) {
    console.error("Error deleting email category:", error)
    return { success: false, error: "Error al eliminar la categoría" }
  }
}

// ─── Facturas ────────────────────────────────────────────────

export async function getInvoices() {
  await requirePermission("atc", "manage")
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        reservation: { select: { id: true, guestName: true, date: true } },
      },
      orderBy: { generatedAt: "desc" },
    })
    return { success: true, data: invoices }
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return { success: false, error: "Error al cargar las facturas" }
  }
}

export async function createInvoice(data: InvoiceFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = invoiceSchema.parse(data)
    const invoice = await prisma.invoice.create({ data: validated })
    revalidatePath("/atc/backoffice")
    return { success: true, data: invoice }
  } catch (error) {
    console.error("Error creating invoice:", error)
    return { success: false, error: "Error al crear la factura" }
  }
}

// ─── Bonos Regalo ─────────────────────────────────────────────

export async function getGiftVouchers() {
  await requirePermission("atc", "manage")
  try {
    const vouchers = await prisma.giftVoucher.findMany({
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: vouchers }
  } catch (error) {
    console.error("Error fetching vouchers:", error)
    return { success: false, error: "Error al cargar los bonos regalo" }
  }
}

export async function createGiftVoucher(data: GiftVoucherFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = giftVoucherSchema.parse(data)
    const voucher = await prisma.giftVoucher.create({
      data: { ...validated, remainingValue: validated.value },
    })
    revalidatePath("/atc/backoffice")
    return { success: true, data: voucher }
  } catch (error) {
    console.error("Error creating voucher:", error)
    return { success: false, error: "Error al crear el bono regalo" }
  }
}

export async function redeemVoucher(code: string, amount: number) {
  await requirePermission("atc", "manage")
  try {
    const voucher = await prisma.giftVoucher.findUnique({ where: { code } })
    if (!voucher) return { success: false, error: "Bono no encontrado" }
    if (voucher.status !== "ACTIVE") return { success: false, error: "El bono no está activo" }
    if (voucher.remainingValue < amount) return { success: false, error: "Saldo insuficiente" }

    const newBalance = voucher.remainingValue - amount
    const [updatedVoucher] = await prisma.$transaction([
      prisma.giftVoucher.update({
        where: { id: voucher.id },
        data: {
          remainingValue: newBalance,
          status: newBalance <= 0 ? "USED" : "ACTIVE",
        },
      }),
      prisma.voucherTransaction.create({
        data: { voucherId: voucher.id, amount, type: "REDEMPTION" },
      }),
    ])

    revalidatePath("/atc/backoffice")
    return { success: true, data: updatedVoucher }
  } catch (error) {
    console.error("Error redeeming voucher:", error)
    return { success: false, error: "Error al canjear el bono" }
  }
}
