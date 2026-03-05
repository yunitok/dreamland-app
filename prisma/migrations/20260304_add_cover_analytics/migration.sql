-- AlterTable
ALTER TABLE "restaurant_locations" ADD COLUMN     "cmSlug" TEXT;

-- CreateTable
CREATE TABLE "cover_snapshots" (
    "id" TEXT NOT NULL,
    "restaurantLocationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalCovers" INTEGER NOT NULL DEFAULT 0,
    "totalReservations" INTEGER NOT NULL DEFAULT 0,
    "avgPartySize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxPartySize" INTEGER NOT NULL DEFAULT 0,
    "coversByStatus" JSONB,
    "coversByHour" JSONB,
    "lunchCovers" INTEGER,
    "dinnerCovers" INTEGER,
    "walkInCovers" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cover_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_sync_logs" (
    "id" TEXT NOT NULL,
    "restaurantLocationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "snapshotsCreated" INTEGER NOT NULL DEFAULT 0,
    "snapshotsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "cover_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cover_snapshots_date_idx" ON "cover_snapshots"("date");

-- CreateIndex
CREATE INDEX "cover_snapshots_restaurantLocationId_date_idx" ON "cover_snapshots"("restaurantLocationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cover_snapshots_restaurantLocationId_date_key" ON "cover_snapshots"("restaurantLocationId", "date");

-- CreateIndex
CREATE INDEX "cover_sync_logs_status_idx" ON "cover_sync_logs"("status");

-- CreateIndex
CREATE INDEX "cover_sync_logs_startedAt_idx" ON "cover_sync_logs"("startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_locations_cmSlug_key" ON "restaurant_locations"("cmSlug");

-- AddForeignKey
ALTER TABLE "cover_snapshots" ADD CONSTRAINT "cover_snapshots_restaurantLocationId_fkey" FOREIGN KEY ("restaurantLocationId") REFERENCES "restaurant_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
