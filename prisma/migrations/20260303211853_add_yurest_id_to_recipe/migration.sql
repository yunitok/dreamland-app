-- DropIndex
DROP INDEX "knowledge_base_domains_idx";

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "yurestId" INTEGER;

-- CreateIndex
CREATE INDEX "recipes_yurestId_idx" ON "recipes"("yurestId");
