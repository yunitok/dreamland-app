const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockGenerateEmailDraft = vi.hoisted(() => vi.fn())
const mockSendGmailMessage = vi.hoisted(() => vi.fn())
const mockGetSignedUrl = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockFindFirst = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())
const mockDeleteMany = vi.hoisted(() => vi.fn())
const mockCount = vi.hoisted(() => vi.fn())
const mockInboxUpdate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("@/lib/auth", () => ({ getSession: mockGetSession }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/modules/atc/domain/draft-generator", () => ({ generateEmailDraft: mockGenerateEmailDraft }))
vi.mock("@/modules/atc/domain/gmail-service", () => ({ sendGmailMessage: mockSendGmailMessage }))
vi.mock("@/lib/supabase-storage", () => ({ getSignedUrl: mockGetSignedUrl }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailReply: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
      count: mockCount,
    },
    emailInbox: {
      update: mockInboxUpdate,
    },
  },
}))

import {
  generateDraft,
  sendDraft,
  discardDraft,
  regenerateDraft,
  getDraftForEmail,
} from "@/modules/atc/actions/email-drafts"

describe("generateDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateEmailDraft.mockResolvedValue({ id: "draft-1" })
  })

  it("requiere manage:atc", async () => {
    await generateDraft("inbox-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("genera borrador y revalida", async () => {
    const result = await generateDraft("inbox-1")
    expect(result.success).toBe(true)
    expect(mockGenerateEmailDraft).toHaveBeenCalledWith("inbox-1")
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it("retorna error si falla", async () => {
    mockGenerateEmailDraft.mockRejectedValue(new Error("AI error"))
    const result = await generateDraft("inbox-1")
    expect(result.success).toBe(false)
    expect(result.error).toContain("AI error")
  })
})

describe("sendDraft", () => {
  const mockDraft = {
    id: "draft-1",
    isDraft: true,
    emailInboxId: "inbox-1",
    toEmails: ["to@test.com"],
    ccEmails: [],
    subject: "Re: Test",
    bodyHtml: "<p>Reply</p>",
    attachments: [],
    emailInbox: { threadId: "t1", messageId: "msg-1" },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockFindUnique.mockResolvedValue(mockDraft)
    mockSendGmailMessage.mockResolvedValue({ messageId: "gm-1", threadId: "gt-1" })
    mockUpdate.mockResolvedValue({})
    mockInboxUpdate.mockResolvedValue({})
  })

  it("envía borrador correctamente", async () => {
    const result = await sendDraft("draft-1")
    expect(result.success).toBe(true)
    expect(mockSendGmailMessage).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "draft-1" },
      data: expect.objectContaining({ isDraft: false }),
    }))
  })

  it("retorna error si draft no encontrado", async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await sendDraft("x")
    expect(result.success).toBe(false)
    expect(result.error).toContain("no encontrado")
  })

  it("retorna error si ya fue enviado", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDraft, isDraft: false })
    const result = await sendDraft("draft-1")
    expect(result.success).toBe(false)
    expect(result.error).toContain("ya fue enviado")
  })

  it("retorna error sin sesión", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await sendDraft("draft-1")
    expect(result.success).toBe(false)
  })
})

describe("discardDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({ id: "d1", isDraft: true, emailInboxId: "inbox-1" })
    mockDelete.mockResolvedValue({})
    mockCount.mockResolvedValue(0)
    mockInboxUpdate.mockResolvedValue({})
  })

  it("descarta borrador y actualiza hasDraft", async () => {
    const result = await discardDraft("d1")
    expect(result.success).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "d1" } })
    expect(mockInboxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hasDraft: false } })
    )
  })

  it("no actualiza hasDraft si hay otros borradores", async () => {
    mockCount.mockResolvedValue(2)
    await discardDraft("d1")
    expect(mockInboxUpdate).not.toHaveBeenCalled()
  })

  it("retorna error si no es borrador", async () => {
    mockFindUnique.mockResolvedValue({ id: "d1", isDraft: false })
    const result = await discardDraft("d1")
    expect(result.success).toBe(false)
  })

  it("retorna error si no encontrado", async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await discardDraft("x")
    expect(result.success).toBe(false)
  })
})

describe("regenerateDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteMany.mockResolvedValue({ count: 1 })
    mockInboxUpdate.mockResolvedValue({})
    mockGenerateEmailDraft.mockResolvedValue({ id: "new-draft" })
  })

  it("elimina borradores existentes y genera nuevo", async () => {
    const result = await regenerateDraft("inbox-1")
    expect(result.success).toBe(true)
    expect(mockDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { emailInboxId: "inbox-1", isDraft: true } })
    )
    expect(mockGenerateEmailDraft).toHaveBeenCalledWith("inbox-1")
  })
})

describe("getDraftForEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue(null)
  })

  it("requiere read:atc", async () => {
    await getDraftForEmail("inbox-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("busca borrador más reciente", async () => {
    mockFindFirst.mockResolvedValue({ id: "d1", isDraft: true })
    const result = await getDraftForEmail("inbox-1")
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
