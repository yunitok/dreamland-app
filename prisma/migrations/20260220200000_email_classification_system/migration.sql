-- CreateTable
CREATE TABLE "email_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "icon" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_categories_slug_key" ON "email_categories"("slug");

-- CreateIndex
CREATE INDEX "email_categories_parentId_idx" ON "email_categories"("parentId");

-- CreateIndex
CREATE INDEX "email_categories_isActive_idx" ON "email_categories"("isActive");

-- AddForeignKey
ALTER TABLE "email_categories" ADD CONSTRAINT "email_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "email_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable email_inbox: add new columns
ALTER TABLE "email_inbox"
    ADD COLUMN "messageId" TEXT,
    ADD COLUMN "threadId" TEXT,
    ADD COLUMN "fromName" TEXT,
    ADD COLUMN "aiConfidenceScore" DOUBLE PRECISION,
    ADD COLUMN "aiSummary" TEXT,
    ADD COLUMN "categoryId" TEXT,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill messageId for existing rows (use id as fallback to satisfy unique constraint)
UPDATE "email_inbox" SET "messageId" = "id" WHERE "messageId" IS NULL;

-- Make messageId NOT NULL and add unique constraint
ALTER TABLE "email_inbox" ALTER COLUMN "messageId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "email_inbox_messageId_key" ON "email_inbox"("messageId");

-- CreateIndex
CREATE INDEX "email_inbox_categoryId_idx" ON "email_inbox"("categoryId");

-- CreateIndex
CREATE INDEX "email_inbox_assignedTo_idx" ON "email_inbox"("assignedTo");

-- AddForeignKey
ALTER TABLE "email_inbox" ADD CONSTRAINT "email_inbox_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "email_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
