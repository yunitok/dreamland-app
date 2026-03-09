-- AlterTable
ALTER TABLE "restaurant_locations" ADD COLUMN     "agoraPosId" INTEGER;

-- CreateTable
CREATE TABLE "agora_sales_snapshots" (
    "id" TEXT NOT NULL,
    "restaurantLocationId" TEXT NOT NULL,
    "businessDay" DATE NOT NULL,
    "totalInvoices" INTEGER NOT NULL DEFAULT 0,
    "totalGrossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "avgTicket" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSpendPerGuest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesByFamily" JSONB,
    "salesByPaymentMethod" JSONB,
    "salesByHour" JSONB,
    "topProducts" JSONB,
    "taxBreakdown" JSONB,
    "cashExpected" DOUBLE PRECISION,
    "cashReal" DOUBLE PRECISION,
    "cashDifference" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agora_sales_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agora_products" (
    "id" TEXT NOT NULL,
    "agoraId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "familyId" INTEGER,
    "familyName" TEXT,
    "vatRate" DOUBLE PRECISION,
    "mainPrice" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "barcode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recipeId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agora_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agora_sync_logs" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "snapshotsCreated" INTEGER NOT NULL DEFAULT 0,
    "snapshotsUpdated" INTEGER NOT NULL DEFAULT 0,
    "productsCreated" INTEGER NOT NULL DEFAULT 0,
    "productsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "agora_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agora_sales_snapshots_businessDay_idx" ON "agora_sales_snapshots"("businessDay");

-- CreateIndex
CREATE INDEX "agora_sales_snapshots_restaurantLocationId_businessDay_idx" ON "agora_sales_snapshots"("restaurantLocationId", "businessDay");

-- CreateIndex
CREATE UNIQUE INDEX "agora_sales_snapshots_restaurantLocationId_businessDay_key" ON "agora_sales_snapshots"("restaurantLocationId", "businessDay");

-- CreateIndex
CREATE UNIQUE INDEX "agora_products_agoraId_key" ON "agora_products"("agoraId");

-- CreateIndex
CREATE INDEX "agora_products_name_idx" ON "agora_products"("name");

-- CreateIndex
CREATE INDEX "agora_products_familyName_idx" ON "agora_products"("familyName");

-- CreateIndex
CREATE INDEX "agora_products_recipeId_idx" ON "agora_products"("recipeId");

-- CreateIndex
CREATE INDEX "agora_sync_logs_status_idx" ON "agora_sync_logs"("status");

-- CreateIndex
CREATE INDEX "agora_sync_logs_startedAt_idx" ON "agora_sync_logs"("startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_locations_agoraPosId_key" ON "restaurant_locations"("agoraPosId");

-- AddForeignKey
ALTER TABLE "agora_sales_snapshots" ADD CONSTRAINT "agora_sales_snapshots_restaurantLocationId_fkey" FOREIGN KEY ("restaurantLocationId") REFERENCES "restaurant_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agora_products" ADD CONSTRAINT "agora_products_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
