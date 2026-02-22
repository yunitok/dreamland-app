import { describe, it, expect, vi, beforeEach } from "vitest"

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath    = vi.hoisted(() => vi.fn())
const mockPrismaEmailInbox         = vi.hoisted(() => ({ findMany: vi.fn(), update: vi.fn() }))
const mockPrismaEmailCategory      = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn(), update: vi.fn() }))
const mockPrismaInvoice            = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn() }))
const mockPrismaGiftVoucher        = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }))
const mockPrismaVoucherTransaction = vi.hoisted(() => ({ create: vi.fn() }))
const mockPrismaTransaction        = vi.hoisted(() => vi.fn())
vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache",         () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/lib/prisma", () => ({ prisma: { emailInbox: mockPrismaEmailInbox, emailCategory: mockPrismaEmailCategory, invoice: mockPrismaInvoice, giftVoucher: mockPrismaGiftVoucher, voucherTransaction: mockPrismaVoucherTransaction, $transaction: mockPrismaTransaction } }))
import { getEmailInbox, markEmailRead, assignEmail, reclassifyEmail, getEmailCategories, createEmailCategory, updateEmailCategory, deleteEmailCategory, getInvoices, createInvoice, getGiftVouchers, createGiftVoucher, redeemVoucher } from "@/modules/atc/actions/backoffice"
import type { EmailCategoryFormValues, InvoiceFormValues, GiftVoucherFormValues } from "@/modules/atc/domain/schemas"
function createMockGiftVoucher(overrides: Record<string, unknown> = {}) { return { id: "voucher-1", code: "GIFT2026", value: 100, remainingValue: 100, status: "ACTIVE", purchasedBy: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date(), ...overrides } }
const validCategory: EmailCategoryFormValues = { name: "Reservas", slug: "reservas", color: "#6B7280", isActive: true, sortOrder: 0 }
const validInvoice: InvoiceFormValues = { guestName: "Juan Garcia", items: [{ description: "Menu degustacion", quantity: 2, unitPrice: 75 }], subtotal: 150, tax: 31.5, total: 181.5 }
const validVoucher: GiftVoucherFormValues = { code: "GIFT2026", value: 100 }
beforeEach(() => { vi.clearAllMocks(); mockRequirePermission.mockResolvedValue(undefined); mockPrismaTransaction.mockResolvedValue([createMockGiftVoucher(), {}]) })
describe("getEmailInbox", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailInbox.findMany.mockResolvedValue([]); await getEmailInbox(); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("sin filtros aplica where={isRead:false}", async () => {
    mockPrismaEmailInbox.findMany.mockResolvedValue([])
    await getEmailInbox()
    expect(mockPrismaEmailInbox.findMany).toHaveBeenCalledWith({ where: { isRead: false }, include: { category: { select: { id: true, name: true, color: true, icon: true, slug: true } } }, orderBy: [{ aiPriority: "desc" }, { receivedAt: "desc" }], take: 100 })
  })
  it("showRead:true no incluye isRead en el filtro where", async () => { mockPrismaEmailInbox.findMany.mockResolvedValue([]); await getEmailInbox({ showRead: true }); const call = mockPrismaEmailInbox.findMany.mock.calls[0][0]; expect(call.where).not.toHaveProperty("isRead") })
  it("filtro categoryId se pasa en where", async () => { mockPrismaEmailInbox.findMany.mockResolvedValue([]); await getEmailInbox({ categoryId: "cat-1" }); const call = mockPrismaEmailInbox.findMany.mock.calls[0][0]; expect(call.where).toMatchObject({ categoryId: "cat-1" }) })
  it("filtro search genera OR con 3 campos insensitive", async () => { mockPrismaEmailInbox.findMany.mockResolvedValue([]); await getEmailInbox({ search: "hotel" }); const call = mockPrismaEmailInbox.findMany.mock.calls[0][0]; expect(call.where.OR).toEqual([{ fromEmail: { contains: "hotel", mode: "insensitive" } }, { fromName: { contains: "hotel", mode: "insensitive" } }, { subject: { contains: "hotel", mode: "insensitive" } }]) })
})
describe("markEmailRead", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await markEmailRead("email-1"); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("llama update con {isRead:true}", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await markEmailRead("email-1"); expect(mockPrismaEmailInbox.update).toHaveBeenCalledWith({ where: { id: "email-1" }, data: { isRead: true } }) })
  it("llama revalidatePath", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await markEmailRead("email-1"); expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice") })
  it("retorna {success:true}", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); const result = await markEmailRead("email-1"); expect(result).toEqual({ success: true }) })
})
describe("assignEmail", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await assignEmail("email-1", "user-1"); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("asignar a usuario: update con {assignedTo:user-1}", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await assignEmail("email-1", "user-1"); expect(mockPrismaEmailInbox.update).toHaveBeenCalledWith({ where: { id: "email-1" }, data: { assignedTo: "user-1" } }) })
  it("desasignar (null): update con {assignedTo:null}", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await assignEmail("email-1", null); expect(mockPrismaEmailInbox.update).toHaveBeenCalledWith({ where: { id: "email-1" }, data: { assignedTo: null } }) })
  it("llama revalidatePath", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await assignEmail("email-1", "user-1"); expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice") })
})
describe("reclassifyEmail", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await reclassifyEmail("email-1", "cat-2", "RESERVATION"); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("update con {categoryId, aiLabel}", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await reclassifyEmail("email-1", "cat-2", "RESERVATION"); expect(mockPrismaEmailInbox.update).toHaveBeenCalledWith({ where: { id: "email-1" }, data: { categoryId: "cat-2", aiLabel: "RESERVATION" } }) })
  it("llama revalidatePath", async () => { mockPrismaEmailInbox.update.mockResolvedValue({}); await reclassifyEmail("email-1", "cat-2", "RESERVATION"); expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice") })
})
describe("getEmailCategories", () => {
  it("requiere read:atc", async () => { mockPrismaEmailCategory.findMany.mockResolvedValue([]); await getEmailCategories(); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read") })
  it("findMany con where:{isActive:true}, include con _count y parent", async () => {
    mockPrismaEmailCategory.findMany.mockResolvedValue([])
    await getEmailCategories()
    expect(mockPrismaEmailCategory.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { emails: true } }, parent: { select: { name: true } } } })
  })
})
describe("createEmailCategory", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailCategory.create.mockResolvedValue({ id: "cat-1", ...validCategory }); await createEmailCategory(validCategory); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("datos validos: crea la categoria y llama revalidatePath", async () => { mockPrismaEmailCategory.create.mockResolvedValue({ id: "cat-1", ...validCategory }); const result = await createEmailCategory(validCategory); expect(result.success).toBe(true); expect(mockPrismaEmailCategory.create).toHaveBeenCalledTimes(1); expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice") })
  it("Zod invalido (slug con espacios): retorna {success:false}", async () => { const result = await createEmailCategory({ ...validCategory, slug: "mi categoria" }); expect(result.success).toBe(false); expect(mockPrismaEmailCategory.create).not.toHaveBeenCalled() })
})
describe("updateEmailCategory", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailCategory.update.mockResolvedValue({ id: "cat-1", ...validCategory }); await updateEmailCategory("cat-1", validCategory); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("update llamado con where:{id} y revalidatePath", async () => {
    mockPrismaEmailCategory.update.mockResolvedValue({ id: "cat-1", ...validCategory })
    const result = await updateEmailCategory("cat-1", validCategory)
    expect(result.success).toBe(true)
    expect(mockPrismaEmailCategory.update).toHaveBeenCalledWith({ where: { id: "cat-1" }, data: expect.objectContaining({ name: "Reservas", slug: "reservas" }) })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice")
  })
})
describe("deleteEmailCategory", () => {
  it("requiere manage:atc", async () => { mockPrismaEmailCategory.update.mockResolvedValue({}); await deleteEmailCategory("cat-1"); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("soft delete: update con data:{isActive:false}", async () => { mockPrismaEmailCategory.update.mockResolvedValue({}); await deleteEmailCategory("cat-1"); expect(mockPrismaEmailCategory.update).toHaveBeenCalledWith({ where: { id: "cat-1" }, data: { isActive: false } }) })
  it("llama revalidatePath", async () => { mockPrismaEmailCategory.update.mockResolvedValue({}); await deleteEmailCategory("cat-1"); expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice") })
  it("retorna {success:true}", async () => { mockPrismaEmailCategory.update.mockResolvedValue({}); const result = await deleteEmailCategory("cat-1"); expect(result).toEqual({ success: true }) })
})
describe("getInvoices", () => {
  it("requiere manage:atc", async () => { mockPrismaInvoice.findMany.mockResolvedValue([]); await getInvoices(); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("findMany con include reservation y orderBy:{generatedAt:desc}", async () => { mockPrismaInvoice.findMany.mockResolvedValue([]); await getInvoices(); expect(mockPrismaInvoice.findMany).toHaveBeenCalledWith({ include: { reservation: { select: { id: true, guestName: true, date: true } } }, orderBy: { generatedAt: "desc" } }) })
})
describe("createInvoice", () => {
  it("requiere manage:atc", async () => { mockPrismaInvoice.create.mockResolvedValue({ id: "inv-1", ...validInvoice }); await createInvoice(validInvoice); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("datos validos: create llamado y revalidatePath", async () => { mockPrismaInvoice.create.mockResolvedValue({ id: "inv-1", ...validInvoice }); const result = await createInvoice(validInvoice); expect(result.success).toBe(true); expect(mockPrismaInvoice.create).toHaveBeenCalledTimes(1); expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice") })
  it("Zod invalido (guestName demasiado corto): retorna {success:false}", async () => { const result = await createInvoice({ ...validInvoice, guestName: "X" }); expect(result.success).toBe(false); expect(mockPrismaInvoice.create).not.toHaveBeenCalled() })
})
describe("getGiftVouchers", () => {
  it("requiere manage:atc", async () => { mockPrismaGiftVoucher.findMany.mockResolvedValue([]); await getGiftVouchers(); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("findMany con include:{transactions} y orderBy:{createdAt:desc}", async () => { mockPrismaGiftVoucher.findMany.mockResolvedValue([]); await getGiftVouchers(); expect(mockPrismaGiftVoucher.findMany).toHaveBeenCalledWith({ include: { transactions: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { createdAt: "desc" } }) })
})
describe("createGiftVoucher", () => {
  it("requiere manage:atc", async () => { mockPrismaGiftVoucher.create.mockResolvedValue(createMockGiftVoucher()); await createGiftVoucher(validVoucher); expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage") })
  it("create llamado con remainingValue=value y revalidatePath", async () => {
    mockPrismaGiftVoucher.create.mockResolvedValue(createMockGiftVoucher())
    const result = await createGiftVoucher(validVoucher)
    expect(result.success).toBe(true)
    expect(mockPrismaGiftVoucher.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: "GIFT2026", value: 100, remainingValue: 100 }) })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice")
  })
  it("Zod invalido (value negativo): retorna {success:false}", async () => { const result = await createGiftVoucher({ ...validVoucher, value: -50 }); expect(result.success).toBe(false); expect(mockPrismaGiftVoucher.create).not.toHaveBeenCalled() })
})
describe("redeemVoucher", () => {
  it("bono no encontrado: {success:false, error:Bono no encontrado}", async () => {
    mockPrismaGiftVoucher.findUnique.mockResolvedValue(null)
    const result = await redeemVoucher("INVALID", 50)
    expect(result).toEqual({ success: false, error: "Bono no encontrado" })
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })

  it("bono no activo (status=USED): retorna error correcto", async () => {
    mockPrismaGiftVoucher.findUnique.mockResolvedValue(createMockGiftVoucher({ status: "USED" }))
    const result = await redeemVoucher("GIFT2026", 50)
    expect(result).toEqual({ success: false, error: "El bono no está activo" })
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })

  it("saldo insuficiente: {success:false, error:Saldo insuficiente}", async () => {
    mockPrismaGiftVoucher.findUnique.mockResolvedValue(createMockGiftVoucher({ remainingValue: 30 }))
    const result = await redeemVoucher("GIFT2026", 50)
    expect(result).toEqual({ success: false, error: "Saldo insuficiente" })
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })

  it("redencion parcial (newBalance > 0): transaccion llamada, status sigue ACTIVE", async () => {
    const voucher = createMockGiftVoucher({ remainingValue: 100 })
    const updatedVoucher = createMockGiftVoucher({ remainingValue: 50, status: "ACTIVE" })
    mockPrismaGiftVoucher.findUnique.mockResolvedValue(voucher)
    mockPrismaGiftVoucher.update.mockResolvedValue(updatedVoucher)
    mockPrismaTransaction.mockResolvedValue([updatedVoucher, {}])
    const result = await redeemVoucher("GIFT2026", 50)
    expect(result.success).toBe(true)
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1)
    expect(mockPrismaGiftVoucher.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "voucher-1" }, data: expect.objectContaining({ remainingValue: 50, status: "ACTIVE" }) }))
  })

  it("redencion total (amount=remainingValue): status cambia a USED", async () => {
    const voucher = createMockGiftVoucher({ remainingValue: 100 })
    const updatedVoucher = createMockGiftVoucher({ remainingValue: 0, status: "USED" })
    mockPrismaGiftVoucher.findUnique.mockResolvedValue(voucher)
    mockPrismaGiftVoucher.update.mockResolvedValue(updatedVoucher)
    mockPrismaTransaction.mockResolvedValue([updatedVoucher, {}])
    const result = await redeemVoucher("GIFT2026", 100)
    expect(result.success).toBe(true)
    expect(mockPrismaGiftVoucher.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "voucher-1" }, data: expect.objectContaining({ remainingValue: 0, status: "USED" }) }))
  })

  it("llama revalidatePath tras canjear exitosamente", async () => {
    const voucher = createMockGiftVoucher({ remainingValue: 100 })
    const updatedVoucher = createMockGiftVoucher({ remainingValue: 50, status: "ACTIVE" })
    mockPrismaGiftVoucher.findUnique.mockResolvedValue(voucher)
    mockPrismaGiftVoucher.update.mockResolvedValue(updatedVoucher)
    mockPrismaTransaction.mockResolvedValue([updatedVoucher, {}])
    await redeemVoucher("GIFT2026", 50)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/backoffice")
  })
})