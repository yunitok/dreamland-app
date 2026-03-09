const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockFindManyTemplate = vi.hoisted(() => vi.fn())
const mockFindUniqueTemplate = vi.hoisted(() => vi.fn())
const mockCreateTemplate = vi.hoisted(() => vi.fn())
const mockUpdateTemplate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("@/lib/auth", () => ({ getSession: mockGetSession }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailTemplate: {
      findMany: mockFindManyTemplate,
      findUnique: mockFindUniqueTemplate,
      create: mockCreateTemplate,
      update: mockUpdateTemplate,
    },
  },
}))

import {
  getEmailTemplates,
  getAllEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  renderTemplate,
} from "@/modules/atc/actions/email-templates"

describe("getEmailTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindManyTemplate.mockResolvedValue([])
  })

  it("requiere permiso read:atc", async () => {
    await getEmailTemplates()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("filtra isActive:true", async () => {
    await getEmailTemplates()
    expect(mockFindManyTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
    )
  })

  it("filtra por categoryId cuando se proporciona", async () => {
    await getEmailTemplates("cat-1")
    expect(mockFindManyTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ categoryId: "cat-1" }) })
    )
  })

  it("retorna error si prisma falla", async () => {
    mockFindManyTemplate.mockRejectedValue(new Error("DB"))
    const result = await getEmailTemplates()
    expect(result.success).toBe(false)
  })
})

describe("getAllEmailTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindManyTemplate.mockResolvedValue([])
  })

  it("requiere permiso manage:atc", async () => {
    await getAllEmailTemplates()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("retorna todos los templates", async () => {
    mockFindManyTemplate.mockResolvedValue([{ id: "t1" }, { id: "t2" }])
    const result = await getAllEmailTemplates()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })
})

describe("createEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockCreateTemplate.mockResolvedValue({ id: "t-new" })
  })

  it("requiere manage:atc + session", async () => {
    await createEmailTemplate({ name: "Tpl", subject: "Sub", bodyHtml: "<p>Hi</p>" })
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
    expect(mockGetSession).toHaveBeenCalled()
  })

  it("crea template con Zod válido", async () => {
    const result = await createEmailTemplate({ name: "Tpl", subject: "Sub", bodyHtml: "<p>Hi</p>" })
    expect(result.success).toBe(true)
    expect(mockCreateTemplate).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it("retorna error con Zod inválido", async () => {
    const result = await createEmailTemplate({ name: "", subject: "", bodyHtml: "" })
    expect(result.success).toBe(false)
    expect(mockCreateTemplate).not.toHaveBeenCalled()
  })

  it("retorna error sin sesión", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await createEmailTemplate({ name: "Tpl", subject: "Sub", bodyHtml: "<p>Hi</p>" })
    expect(result.success).toBe(false)
  })
})

describe("updateEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateTemplate.mockResolvedValue({ id: "t1" })
  })

  it("actualiza con where:{id}", async () => {
    const result = await updateEmailTemplate("t1", { name: "Updated", subject: "S", bodyHtml: "<p>X</p>" })
    expect(result.success).toBe(true)
    expect(mockUpdateTemplate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "t1" } }))
  })

  it("retorna error con Zod inválido", async () => {
    const result = await updateEmailTemplate("t1", { name: "", subject: "", bodyHtml: "" })
    expect(result.success).toBe(false)
  })
})

describe("deleteEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateTemplate.mockResolvedValue({ id: "t1" })
  })

  it("soft delete: isActive false", async () => {
    const result = await deleteEmailTemplate("t1")
    expect(result.success).toBe(true)
    expect(mockUpdateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
    expect(mockRevalidatePath).toHaveBeenCalled()
  })
})

describe("renderTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reemplaza variables dinámicas", async () => {
    mockFindUniqueTemplate.mockResolvedValue({
      id: "t1",
      subject: "Hola {nombre}",
      bodyHtml: "<p>Reserva: {fecha}</p>",
    })
    const result = await renderTemplate("t1", { nombre: "Juan", fecha: "2026-03-10" })
    expect(result.success).toBe(true)
    expect(result.data!.subject).toBe("Hola Juan")
    expect(result.data!.bodyHtml).toContain("2026-03-10")
  })

  it("retorna error si template no encontrada", async () => {
    mockFindUniqueTemplate.mockResolvedValue(null)
    const result = await renderTemplate("x", {})
    expect(result.success).toBe(false)
  })
})
