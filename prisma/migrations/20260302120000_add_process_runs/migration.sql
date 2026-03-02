-- CreateEnum
CREATE TYPE "ProcessRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcessTriggerType" AS ENUM ('MANUAL', 'CRON', 'WEBHOOK', 'SYSTEM');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROCESS_FAILED';

-- CreateTable
CREATE TABLE "process_runs" (
    "id" TEXT NOT NULL,
    "processSlug" TEXT NOT NULL,
    "status" "ProcessRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "ProcessTriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "output" JSONB,
    "error" TEXT,
    "phases" JSONB,
    "metadata" JSONB,

    CONSTRAINT "process_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_runs_processSlug_startedAt_idx" ON "process_runs"("processSlug", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "process_runs_status_idx" ON "process_runs"("status");
