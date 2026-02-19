/*
  Warnings:

  - You are about to drop the column `embedding` on the `knowledge_base` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AllergenType" AS ENUM ('GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_SECOS', 'APIO', 'MOSTAZA', 'SESAMO', 'DIOXIDO_AZUFRE', 'ALTRAMUCES', 'MOLUSCOS');

-- AlterTable
ALTER TABLE "knowledge_base" DROP COLUMN "embedding",
ADD COLUMN     "section" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "allergens" "AllergenType"[];

-- CreateIndex
CREATE INDEX "knowledge_base_source_idx" ON "knowledge_base"("source");
