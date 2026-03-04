-- CreateIndex
CREATE INDEX "ingredients_name_idx" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "ingredients_status_name_idx" ON "ingredients"("status", "name");

-- CreateIndex
CREATE INDEX "recipe_categories_name_idx" ON "recipe_categories"("name");

-- CreateIndex
CREATE INDEX "recipe_families_name_idx" ON "recipe_families"("name");

-- CreateIndex
CREATE INDEX "recipes_name_idx" ON "recipes"("name");
