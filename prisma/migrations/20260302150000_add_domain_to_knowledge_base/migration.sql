-- AlterTable: Add domain column with default "atc"
ALTER TABLE "knowledge_base" ADD COLUMN "domain" TEXT NOT NULL DEFAULT 'atc';

-- DropIndex: Remove old unique constraint
DROP INDEX IF EXISTS "knowledge_base_contentHash_source_language_key";

-- CreateIndex: New unique constraint including domain
CREATE UNIQUE INDEX "knowledge_base_contentHash_source_language_domain_key" ON "knowledge_base"("contentHash", "source", "language", "domain");

-- CreateIndex: Index on domain for filtering
CREATE INDEX "knowledge_base_domain_idx" ON "knowledge_base"("domain");
