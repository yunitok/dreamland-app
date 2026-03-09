const mockGmailSend = vi.hoisted(() => vi.fn())
const mockJWT = vi.hoisted(() => vi.fn())

vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: mockJWT,
    },
    gmail: vi.fn(() => ({
      users: {
        messages: {
          send: mockGmailSend,
        },
      },
    })),
  },
}))

import { sendGmailMessage } from "@/modules/atc/domain/gmail-service"

describe("sendGmailMessage", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_SA_KEY_JSON = JSON.stringify({
      client_email: "sa@test.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
    })
    process.env.GMAIL_IMPERSONATE_EMAIL = "contacto@restaurantevoltereta.com"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("envía email simple y retorna messageId + threadId", async () => {
    mockGmailSend.mockResolvedValue({
      data: { id: "msg-123", threadId: "thread-456" },
    })

    const result = await sendGmailMessage({
      to: ["cliente@test.com"],
      subject: "Confirmación reserva",
      bodyHtml: "<p>Buenos días</p>",
    })

    expect(result.messageId).toBe("msg-123")
    expect(result.threadId).toBe("thread-456")
    expect(mockGmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "me",
        requestBody: expect.objectContaining({
          raw: expect.any(String),
        }),
      })
    )
  })

  it("incluye threadId en requestBody cuando se proporciona", async () => {
    mockGmailSend.mockResolvedValue({
      data: { id: "msg-789", threadId: "thread-existing" },
    })

    await sendGmailMessage({
      to: ["cliente@test.com"],
      subject: "Re: Reserva",
      bodyHtml: "<p>Confirmado</p>",
      threadId: "thread-existing",
    })

    expect(mockGmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          threadId: "thread-existing",
        }),
      })
    )
  })

  it("lanza error si GOOGLE_SA_KEY_JSON no está configurada", async () => {
    delete process.env.GOOGLE_SA_KEY_JSON
    await expect(
      sendGmailMessage({ to: ["a@b.com"], subject: "Test", bodyHtml: "<p>Hi</p>" })
    ).rejects.toThrow("GOOGLE_SA_KEY_JSON")
  })

  it("lanza error si GMAIL_IMPERSONATE_EMAIL no está configurada", async () => {
    delete process.env.GMAIL_IMPERSONATE_EMAIL
    await expect(
      sendGmailMessage({ to: ["a@b.com"], subject: "Test", bodyHtml: "<p>Hi</p>" })
    ).rejects.toThrow("GMAIL_IMPERSONATE_EMAIL")
  })
})
