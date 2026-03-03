-- AlterTable: Add domains array column with default
ALTER TABLE "knowledge_base" ADD COLUMN "domains" TEXT[] DEFAULT ARRAY['atc']::TEXT[];

-- MigrateData: Copy existing domain values into domains array
UPDATE "knowledge_base" SET "domains" = ARRAY["domain"];

-- AlterTable: Drop old domain column
ALTER TABLE "knowledge_base" DROP COLUMN "domain";

-- DropIndex: Remove old unique constraint that included domain
DROP INDEX IF EXISTS "knowledge_base_contentHash_source_language_domain_key";

-- CreateIndex: New unique constraint without domain
CREATE UNIQUE INDEX "knowledge_base_contentHash_source_language_key"
  ON "knowledge_base"("contentHash", "source", "language");

-- DropIndex: Remove old single-column domain index
DROP INDEX IF EXISTS "knowledge_base_domain_idx";

-- CreateIndex: GIN index for efficient array queries (has, hasSome, hasEvery)
CREATE INDEX "knowledge_base_domains_idx" ON "knowledge_base" USING GIN ("domains");
