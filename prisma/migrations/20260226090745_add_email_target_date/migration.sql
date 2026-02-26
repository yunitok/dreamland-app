-- AlterTable
ALTER TABLE "email_inbox" ADD COLUMN     "targetDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "email_inbox_targetDate_idx" ON "email_inbox"("targetDate");
