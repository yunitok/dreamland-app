-- AddColumn gstockId to catalog models (nullable @unique)
-- Allows upsert by GStock numeric ID on re-sync instead of matching by name.

ALTER TABLE "measure_units"    ADD COLUMN "gstockId" TEXT;
ALTER TABLE "categories"       ADD COLUMN "gstockId" TEXT;
ALTER TABLE "recipe_categories" ADD COLUMN "gstockId" TEXT;
ALTER TABLE "recipe_families"  ADD COLUMN "gstockId" TEXT;
ALTER TABLE "suppliers"        ADD COLUMN "gstockId" TEXT;

CREATE UNIQUE INDEX "measure_units_gstockId_key"     ON "measure_units"("gstockId");
CREATE UNIQUE INDEX "categories_gstockId_key"        ON "categories"("gstockId");
CREATE UNIQUE INDEX "recipe_categories_gstockId_key" ON "recipe_categories"("gstockId");
CREATE UNIQUE INDEX "recipe_families_gstockId_key"   ON "recipe_families"("gstockId");
CREATE UNIQUE INDEX "suppliers_gstockId_key"         ON "suppliers"("gstockId");
