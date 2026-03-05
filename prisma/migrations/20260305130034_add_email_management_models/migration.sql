-- CreateEnum
CREATE TYPE "EmailReplyType" AS ENUM ('REPLY', 'REPLY_ALL', 'FORWARD');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EMAIL_REPLY_RECEIVED';

-- AlterTable
ALTER TABLE "email_inbox" ADD COLUMN     "hasAttachments" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_replies" (
    "id" TEXT NOT NULL,
    "emailInboxId" TEXT NOT NULL,
    "threadId" TEXT,
    "gmailMessageId" TEXT,
    "replyType" "EmailReplyType" NOT NULL,
    "toEmails" TEXT[],
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notes" (
    "id" TEXT NOT NULL,
    "emailInboxId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_attachments" (
    "id" TEXT NOT NULL,
    "emailInboxId" TEXT,
    "emailReplyId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_replies_gmailMessageId_key" ON "email_replies"("gmailMessageId");

-- CreateIndex
CREATE INDEX "email_replies_emailInboxId_idx" ON "email_replies"("emailInboxId");

-- CreateIndex
CREATE INDEX "email_replies_threadId_idx" ON "email_replies"("threadId");

-- CreateIndex
CREATE INDEX "email_replies_sentBy_idx" ON "email_replies"("sentBy");

-- CreateIndex
CREATE INDEX "email_replies_sentAt_idx" ON "email_replies"("sentAt");

-- CreateIndex
CREATE INDEX "email_notes_emailInboxId_idx" ON "email_notes"("emailInboxId");

-- CreateIndex
CREATE INDEX "email_attachments_emailInboxId_idx" ON "email_attachments"("emailInboxId");

-- CreateIndex
CREATE INDEX "email_attachments_emailReplyId_idx" ON "email_attachments"("emailReplyId");

-- CreateIndex
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");

-- CreateIndex
CREATE INDEX "email_templates_categoryId_idx" ON "email_templates"("categoryId");

-- AddForeignKey
ALTER TABLE "email_replies" ADD CONSTRAINT "email_replies_emailInboxId_fkey" FOREIGN KEY ("emailInboxId") REFERENCES "email_inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_replies" ADD CONSTRAINT "email_replies_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notes" ADD CONSTRAINT "email_notes_emailInboxId_fkey" FOREIGN KEY ("emailInboxId") REFERENCES "email_inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notes" ADD CONSTRAINT "email_notes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_emailInboxId_fkey" FOREIGN KEY ("emailInboxId") REFERENCES "email_inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_emailReplyId_fkey" FOREIGN KEY ("emailReplyId") REFERENCES "email_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "email_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
