import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadToStorage } from "@/lib/supabase-storage"

export async function POST(req: Request) {
  const secret = req.headers.get("x-n8n-secret")
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const formData = await req.formData()
    const messageId = formData.get("messageId") as string | null
    const fileName = formData.get("fileName") as string | null
    const file = formData.get("file") as File | null

    if (!messageId || !fileName || !file) {
      return NextResponse.json(
        { error: "messageId, fileName and file are required" },
        { status: 400 }
      )
    }

    // Find the email
    const email = await prisma.emailInbox.findUnique({
      where: { messageId },
      select: { id: true },
    })

    if (!email) {
      return NextResponse.json(
        { error: `Email not found for messageId: ${messageId}` },
        { status: 404 }
      )
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `email/${email.id}/${Date.now()}_${fileName}`
    await uploadToStorage(
      "attachments",
      storagePath,
      buffer,
      file.type || "application/octet-stream"
    )

    // Create attachment record
    const attachment = await prisma.emailAttachment.create({
      data: {
        emailInboxId: email.id,
        fileName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        storagePath,
      },
    })

    // Ensure hasAttachments is set
    await prisma.emailInbox.update({
      where: { id: email.id },
      data: { hasAttachments: true },
    })

    return NextResponse.json({ id: attachment.id, fileName, storagePath })
  } catch (err) {
    console.error("[email/ingest-attachment] Error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
