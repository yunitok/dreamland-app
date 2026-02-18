-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'WAITING');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('PAYMENT', 'WEATHER', 'COMPLAINT', 'GROUP', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GiftVoucherStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "partySize" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "externalId" TEXT,
    "externalSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiting_list" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiting_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_modifications" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "modifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_modifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queries" (
    "id" TEXT NOT NULL,
    "guestInput" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WEB',
    "status" "QueryStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "query_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "categoryId" TEXT,
    "embedding" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_resolutions" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AI',
    "feedback" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_recoveries" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "failureReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_alerts" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "action" TEXT NOT NULL DEFAULT 'NOTIFY',
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_reservations" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "coordinatorId" TEXT,
    "contractUrl" TEXT,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "specialRequirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_inbox" (
    "id" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "aiLabel" TEXT,
    "aiPriority" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "assignedTo" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reservationId" TEXT,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "remainingValue" DOUBLE PRECISION NOT NULL,
    "status" "GiftVoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchasedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_transactions" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservations_externalId_key" ON "reservations"("externalId");

-- CreateIndex
CREATE INDEX "reservations_date_idx" ON "reservations"("date");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_channelId_idx" ON "reservations"("channelId");

-- CreateIndex
CREATE INDEX "reservations_externalId_idx" ON "reservations"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_channels_code_key" ON "reservation_channels"("code");

-- CreateIndex
CREATE INDEX "waiting_list_requestedDate_idx" ON "waiting_list"("requestedDate");

-- CreateIndex
CREATE INDEX "waiting_list_priority_idx" ON "waiting_list"("priority");

-- CreateIndex
CREATE INDEX "reservation_modifications_reservationId_idx" ON "reservation_modifications"("reservationId");

-- CreateIndex
CREATE INDEX "queries_categoryId_idx" ON "queries"("categoryId");

-- CreateIndex
CREATE INDEX "queries_status_idx" ON "queries"("status");

-- CreateIndex
CREATE INDEX "queries_createdAt_idx" ON "queries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "query_categories_code_key" ON "query_categories"("code");

-- CreateIndex
CREATE INDEX "knowledge_base_categoryId_idx" ON "knowledge_base"("categoryId");

-- CreateIndex
CREATE INDEX "knowledge_base_active_idx" ON "knowledge_base"("active");

-- CreateIndex
CREATE INDEX "query_resolutions_queryId_idx" ON "query_resolutions"("queryId");

-- CreateIndex
CREATE INDEX "incidents_type_idx" ON "incidents"("type");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "payment_recoveries_reservationId_idx" ON "payment_recoveries"("reservationId");

-- CreateIndex
CREATE INDEX "payment_recoveries_status_idx" ON "payment_recoveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "group_reservations_reservationId_key" ON "group_reservations"("reservationId");

-- CreateIndex
CREATE INDEX "email_inbox_isRead_idx" ON "email_inbox"("isRead");

-- CreateIndex
CREATE INDEX "email_inbox_aiPriority_idx" ON "email_inbox"("aiPriority");

-- CreateIndex
CREATE INDEX "email_inbox_receivedAt_idx" ON "email_inbox"("receivedAt");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_reservationId_idx" ON "invoices"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_vouchers_code_key" ON "gift_vouchers"("code");

-- CreateIndex
CREATE INDEX "gift_vouchers_status_idx" ON "gift_vouchers"("status");

-- CreateIndex
CREATE INDEX "gift_vouchers_expiresAt_idx" ON "gift_vouchers"("expiresAt");

-- CreateIndex
CREATE INDEX "voucher_transactions_voucherId_idx" ON "voucher_transactions"("voucherId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "reservation_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_modifications" ADD CONSTRAINT "reservation_modifications_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queries" ADD CONSTRAINT "queries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "query_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_resolutions" ADD CONSTRAINT "query_resolutions_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_recoveries" ADD CONSTRAINT "payment_recoveries_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_reservations" ADD CONSTRAINT "group_reservations_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_transactions" ADD CONSTRAINT "voucher_transactions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "gift_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
