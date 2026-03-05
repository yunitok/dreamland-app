-- CreateEnum
CREATE TYPE "DraftSource" AS ENUM ('AI', 'TEMPLATE', 'MANUAL');

-- AlterTable
ALTER TABLE "email_inbox" ADD COLUMN     "hasDraft" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "email_replies" ADD COLUMN     "draftScore" DOUBLE PRECISION,
ADD COLUMN     "draftSource" "DraftSource",
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ai_tone_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "toneGuide" TEXT NOT NULL,
    "examples" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tone_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_replies_isDraft_idx" ON "email_replies"("isDraft");

-- CreateIndex
CREATE INDEX "email_replies_isDraft_emailInboxId_idx" ON "email_replies"("isDraft", "emailInboxId");
