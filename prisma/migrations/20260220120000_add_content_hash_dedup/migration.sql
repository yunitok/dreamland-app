-- AlterTable
ALTER TABLE "knowledge_base" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_contentHash_source_language_key" ON "knowledge_base"("contentHash", "source", "language");
