-- AlterTable: Add gstockCenterId to RestaurantLocation
ALTER TABLE "restaurant_locations" ADD COLUMN "gstockCenterId" INTEGER;

-- CreateIndex: Unique constraint on gstockCenterId
CREATE UNIQUE INDEX "restaurant_locations_gstockCenterId_key" ON "restaurant_locations"("gstockCenterId");

-- AlterTable: Add restaurantLocationId to InventoryRecord
ALTER TABLE "inventory_records" ADD COLUMN "restaurantLocationId" TEXT;

-- AlterTable: Add restaurantLocationId to WasteRecord
ALTER TABLE "waste_records" ADD COLUMN "restaurantLocationId" TEXT;

-- CreateTable: FoodCostSnapshot
CREATE TABLE "food_cost_snapshots" (
    "id" TEXT NOT NULL,
    "restaurantLocationId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "realCostTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realCostByCategory" JSONB,
    "theoreticalCostTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodRevenue" DOUBLE PRECISION,
    "foodCostPercent" DOUBLE PRECISION,
    "stockVariationTotal" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_cost_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: FoodCostSnapshot unique + search
CREATE UNIQUE INDEX "food_cost_snapshots_restaurantLocationId_periodStart_periodEnd_key"
    ON "food_cost_snapshots"("restaurantLocationId", "periodStart", "periodEnd");

CREATE INDEX "food_cost_snapshots_restaurantLocationId_periodStart_idx"
    ON "food_cost_snapshots"("restaurantLocationId", "periodStart");

-- CreateIndex: InventoryRecord + WasteRecord restaurantLocationId
CREATE INDEX "inventory_records_restaurantLocationId_idx" ON "inventory_records"("restaurantLocationId");
CREATE INDEX "waste_records_restaurantLocationId_idx" ON "waste_records"("restaurantLocationId");

-- AddForeignKey: FoodCostSnapshot → RestaurantLocation
ALTER TABLE "food_cost_snapshots" ADD CONSTRAINT "food_cost_snapshots_restaurantLocationId_fkey"
    FOREIGN KEY ("restaurantLocationId") REFERENCES "restaurant_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: InventoryRecord → RestaurantLocation
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_restaurantLocationId_fkey"
    FOREIGN KEY ("restaurantLocationId") REFERENCES "restaurant_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: WasteRecord → RestaurantLocation
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_restaurantLocationId_fkey"
    FOREIGN KEY ("restaurantLocationId") REFERENCES "restaurant_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
