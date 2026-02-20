-- AlterTable
ALTER TABLE "knowledge_base" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es';

-- CreateIndex
CREATE INDEX "knowledge_base_language_idx" ON "knowledge_base"("language");
