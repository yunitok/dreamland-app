const mockInboxFindUnique = vi.hoisted(() => vi.fn())
const mockInboxFindMany = vi.hoisted(() => vi.fn())
const mockInboxUpdate = vi.hoisted(() => vi.fn())
const mockReplyFindFirst = vi.hoisted(() => vi.fn())
const mockReplyCreate = vi.hoisted(() => vi.fn())
const mockReplyFindMany = vi.hoisted(() => vi.fn())
const mockToneProfileFindFirst = vi.hoisted(() => vi.fn())
const mockToneProfileUpdate = vi.hoisted(() => vi.fn())
const mockToneProfileCreate = vi.hoisted(() => vi.fn())
const mockTemplateFindMany = vi.hoisted(() => vi.fn())
const mockGenerateText = vi.hoisted(() => vi.fn())
const mockGetChatLanguageModel = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailInbox: {
      findUnique: mockInboxFindUnique,
      findMany: mockInboxFindMany,
      update: mockInboxUpdate,
    },
    emailReply: {
      findFirst: mockReplyFindFirst,
      create: mockReplyCreate,
      findMany: mockReplyFindMany,
    },
    aiToneProfile: {
      findFirst: mockToneProfileFindFirst,
      update: mockToneProfileUpdate,
      create: mockToneProfileCreate,
    },
    emailTemplate: {
      findMany: mockTemplateFindMany,
    },
  },
}))

vi.mock("ai", () => ({
  generateText: mockGenerateText,
}))

vi.mock("@/lib/ai/config", () => ({
  getChatLanguageModel: mockGetChatLanguageModel,
}))

import { generateEmailDraft, extractToneFromEmails } from "@/modules/atc/domain/draft-generator"

describe("generateEmailDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChatLanguageModel.mockReturnValue("mock-model")
  })

  it("lanza error si email no encontrado", async () => {
    mockInboxFindUnique.mockResolvedValue(null)
    await expect(generateEmailDraft("x")).rejects.toThrow("Email no encontrado")
  })

  it("lanza error si ya existe un borrador", async () => {
    mockInboxFindUnique.mockResolvedValue({
      id: "e1",
      threadId: null,
      fromEmail: "client@test.com",
      subject: "Test",
      body: "Hola",
      categoryId: null,
      category: null,
    })
    mockReplyFindFirst.mockResolvedValue({ id: "draft-1", isDraft: true })

    await expect(generateEmailDraft("e1")).rejects.toThrow("Ya existe un borrador")
  })

  it("genera borrador exitosamente sin thread ni tone profile", async () => {
    mockInboxFindUnique.mockResolvedValue({
      id: "e1",
      threadId: null,
      fromEmail: "client@test.com",
      fromName: "Juan",
      subject: "Reserva",
      body: "Quiero reservar mesa",
      aiSummary: null,
      aiLabel: null,
      categoryId: null,
      category: null,
    })
    mockReplyFindFirst.mockResolvedValue(null)
    mockToneProfileFindFirst.mockResolvedValue(null)
    mockTemplateFindMany.mockResolvedValue([])
    mockGenerateText.mockResolvedValue({ text: "<p>Buenos días Juan</p>" })
    mockReplyCreate.mockResolvedValue({ id: "draft-1" })
    mockInboxUpdate.mockResolvedValue({})

    const result = await generateEmailDraft("e1")

    expect(result.draftId).toBe("draft-1")
    expect(result.confidence).toBe(0.8)
    expect(mockReplyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDraft: true,
          draftSource: "AI",
          toEmails: ["client@test.com"],
        }),
      })
    )
    expect(mockInboxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { hasDraft: true },
      })
    )
  })

  it("incluye contexto de thread cuando existe threadId", async () => {
    mockInboxFindUnique.mockResolvedValue({
      id: "e1",
      threadId: "t1",
      fromEmail: "client@test.com",
      fromName: null,
      subject: "Reserva",
      body: "Quiero reservar mesa",
      aiSummary: null,
      aiLabel: null,
      categoryId: null,
      category: null,
    })
    mockReplyFindFirst.mockResolvedValue(null)
    mockInboxFindMany.mockResolvedValue([
      { fromEmail: "otro@test.com", subject: "Re: Reserva", body: "Anterior", receivedAt: new Date() },
    ])
    mockToneProfileFindFirst.mockResolvedValue(null)
    mockTemplateFindMany.mockResolvedValue([])
    mockGenerateText.mockResolvedValue({ text: "<p>Respuesta</p>" })
    mockReplyCreate.mockResolvedValue({ id: "draft-2" })
    mockInboxUpdate.mockResolvedValue({})

    await generateEmailDraft("e1")

    expect(mockInboxFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ threadId: "t1" }),
      })
    )
    // Verify generateText was called with thread context in messages
    const generateCall = mockGenerateText.mock.calls[0][0]
    const allContent = generateCall.messages.map((m: { content: string }) => m.content).join(" ")
    expect(allContent).toContain("CONTEXTO DEL HILO")
  })

  it("incluye tone profile y templates cuando existen", async () => {
    mockInboxFindUnique.mockResolvedValue({
      id: "e1",
      threadId: null,
      fromEmail: "client@test.com",
      fromName: "Ana",
      subject: "Consulta",
      body: "Pregunta",
      aiSummary: "Resumen AI",
      aiLabel: null,
      categoryId: "cat-1",
      category: { name: "Reservas", slug: "reservas" },
    })
    mockReplyFindFirst.mockResolvedValue(null)
    mockToneProfileFindFirst.mockResolvedValue({
      toneGuide: "Tono cercano y amable",
      examples: [{ input: "Hola", output: "Buenos días" }],
    })
    mockTemplateFindMany.mockResolvedValue([
      { name: "Confirmación", bodyHtml: "<p>Confirmamos su reserva</p>" },
    ])
    mockGenerateText.mockResolvedValue({ text: "<p>Buenos días Ana</p>" })
    mockReplyCreate.mockResolvedValue({ id: "draft-3" })
    mockInboxUpdate.mockResolvedValue({})

    await generateEmailDraft("e1")

    const generateCall = mockGenerateText.mock.calls[0][0]
    const systemMsg = generateCall.messages.find((m: { role: string }) => m.role === "system")
    expect(systemMsg.content).toContain("Tono cercano y amable")
    expect(systemMsg.content).toContain("Reservas")
    expect(systemMsg.content).toContain("Confirmación")
  })
})

describe("extractToneFromEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChatLanguageModel.mockReturnValue("mock-model")
  })

  it("crea perfil nuevo cuando no existe uno activo", async () => {
    mockInboxFindMany.mockResolvedValue([])
    mockReplyFindMany.mockResolvedValue([])
    mockToneProfileFindFirst.mockResolvedValue(null)
    mockToneProfileCreate.mockResolvedValue({ id: "tp-1" })

    const result = await extractToneFromEmails()

    expect(result.profileId).toBe("tp-1")
    expect(result.examplesCount).toBe(0)
    expect(mockToneProfileCreate).toHaveBeenCalled()
  })

  it("actualiza perfil existente cuando hay uno activo", async () => {
    mockInboxFindMany.mockResolvedValue([])
    // Fallback a EmailReply
    mockReplyFindMany.mockResolvedValue([
      {
        bodyHtml: "<p>Buenos días</p>",
        bodyText: "Buenos días",
        sentAt: new Date(),
        isDraft: false,
        emailInbox: { body: "Consulta sobre reserva", fromEmail: "client@test.com", subject: "Reserva" },
      },
    ])
    mockToneProfileFindFirst.mockResolvedValue({ id: "tp-existing", version: 1 })
    mockToneProfileUpdate.mockResolvedValue({ id: "tp-existing" })

    const result = await extractToneFromEmails()

    expect(result.profileId).toBe("tp-existing")
    expect(result.examplesCount).toBe(1)
    expect(mockToneProfileUpdate).toHaveBeenCalled()
    expect(mockToneProfileCreate).not.toHaveBeenCalled()
  })

  it("usa AI para generar toneGuide cuando hay >= 3 ejemplos", async () => {
    mockInboxFindMany.mockResolvedValue([])
    mockReplyFindMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        bodyHtml: `<p>Respuesta ${i}</p>`,
        bodyText: `Respuesta ${i}`,
        sentAt: new Date(),
        isDraft: false,
        emailInbox: { body: `Consulta ${i}`, fromEmail: "c@test.com", subject: `Asunto ${i}` },
      }))
    )
    mockGenerateText.mockResolvedValue({ text: "Guía de tono extraída por IA" })
    mockToneProfileFindFirst.mockResolvedValue(null)
    mockToneProfileCreate.mockResolvedValue({ id: "tp-new" })

    const result = await extractToneFromEmails()

    expect(mockGenerateText).toHaveBeenCalled()
    expect(result.examplesCount).toBe(5)
  })
})
