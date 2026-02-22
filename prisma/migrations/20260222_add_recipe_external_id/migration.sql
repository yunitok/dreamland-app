-- AlterTable
ALTER TABLE "recipes" ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalSource" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recipes_externalId_key" ON "recipes"("externalId");

-- CreateIndex
CREATE INDEX "recipes_externalId_idx" ON "recipes"("externalId");
