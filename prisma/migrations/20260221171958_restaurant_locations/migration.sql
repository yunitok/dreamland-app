-- AlterTable
ALTER TABLE "weather_alerts" ALTER COLUMN "location" DROP DEFAULT;

-- CreateTable
CREATE TABLE "restaurant_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "aemetMunicipioId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_locations_city_idx" ON "restaurant_locations"("city");

-- CreateIndex
CREATE INDEX "restaurant_locations_isActive_idx" ON "restaurant_locations"("isActive");

-- CreateIndex
CREATE INDEX "weather_alerts_location_idx" ON "weather_alerts"("location");
