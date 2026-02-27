-- AlterTable
ALTER TABLE "email_inbox" ADD COLUMN     "actionRequired" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "email_inbox_threadId_idx" ON "email_inbox"("threadId");

-- CreateIndex
CREATE INDEX "email_inbox_actionRequired_idx" ON "email_inbox"("actionRequired");
