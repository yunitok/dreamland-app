-- AlterTable: add walkInToken for opaque walk-in URLs (anti-enumeration)
ALTER TABLE "restaurant_locations" ADD COLUMN "walkInToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_locations_walkInToken_key" ON "restaurant_locations"("walkInToken");
