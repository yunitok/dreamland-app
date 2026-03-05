import { google } from "googleapis"

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

function getGmailClient() {
  const keyJson = process.env.GOOGLE_SA_KEY_JSON
  if (!keyJson) throw new Error("GOOGLE_SA_KEY_JSON no está configurada")
  const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL
  if (!impersonateEmail) throw new Error("GMAIL_IMPERSONATE_EMAIL no está configurada")

  const key = JSON.parse(keyJson)
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: SCOPES,
    subject: impersonateEmail,
  })

  return google.gmail({ version: "v1", auth })
}

interface SendEmailParams {
  to: string[]
  cc?: string[]
  subject: string
  bodyHtml: string
  threadId?: string | null
  inReplyTo?: string | null
  references?: string | null
  attachments?: Array<{
    filename: string
    mimeType: string
    content: Buffer
  }>
}

/**
 * Construye un mensaje MIME RFC 2822 con soporte para adjuntos.
 */
function buildMimeMessage(params: SendEmailParams): string {
  const from = process.env.GMAIL_IMPERSONATE_EMAIL ?? "contacto@restaurantevoltereta.com"
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const hasAttachments = params.attachments && params.attachments.length > 0

  const headers = [
    `From: ${from}`,
    `To: ${params.to.join(", ")}`,
    ...(params.cc && params.cc.length > 0 ? [`Cc: ${params.cc.join(", ")}`] : []),
    `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    ...(params.inReplyTo ? [`In-Reply-To: ${params.inReplyTo}`] : []),
    ...(params.references ? [`References: ${params.references}`] : []),
  ]

  if (!hasAttachments) {
    headers.push(`Content-Type: text/html; charset=UTF-8`)
    headers.push(`Content-Transfer-Encoding: base64`)
    return [...headers, "", Buffer.from(params.bodyHtml).toString("base64")].join("\r\n")
  }

  // Multipart mixed para adjuntos
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)

  const parts: string[] = [
    ...headers,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    Buffer.from(params.bodyHtml).toString("base64"),
  ]

  for (const att of params.attachments!) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${att.mimeType}; name="${att.filename}"`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      "",
      att.content.toString("base64")
    )
  }

  parts.push(`--${boundary}--`)
  return parts.join("\r\n")
}

interface SendResult {
  messageId: string
  threadId: string
}

/**
 * Envía un email a través de Gmail API usando la Service Account.
 */
export async function sendGmailMessage(params: SendEmailParams): Promise<SendResult> {
  const gmail = getGmailClient()
  const raw = buildMimeMessage(params)
  const encodedMessage = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      ...(params.threadId ? { threadId: params.threadId } : {}),
    },
  })

  return {
    messageId: response.data.id ?? "",
    threadId: response.data.threadId ?? "",
  }
}
