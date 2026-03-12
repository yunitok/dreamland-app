-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('QUEUED', 'THINKING', 'ACTING', 'OBSERVING', 'COMPLETED', 'ESCALATED', 'FAILED', 'CANCELLED');

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'AGENT_ESCALATION';
ALTER TYPE "NotificationType" ADD VALUE 'AGENT_INSIGHT';

-- CreateTable: agent_runs
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerType" "ProcessTriggerType" NOT NULL DEFAULT 'SYSTEM',
    "triggeredBy" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "maxSteps" INTEGER NOT NULL DEFAULT 10,
    "state" JSONB,
    "steps" JSONB,
    "output" JSONB,
    "error" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "parentRunId" TEXT,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agent_memories
CREATE TABLE "agent_memories" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agent_events
CREATE TABLE "agent_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceAgent" TEXT,
    "targetAgent" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_runs_agentId_startedAt_idx" ON "agent_runs"("agentId", "startedAt" DESC);
CREATE INDEX "agent_runs_status_idx" ON "agent_runs"("status");
CREATE INDEX "agent_runs_parentRunId_idx" ON "agent_runs"("parentRunId");

CREATE INDEX "agent_memories_agentId_type_idx" ON "agent_memories"("agentId", "type");
CREATE INDEX "agent_memories_agentId_createdAt_idx" ON "agent_memories"("agentId", "createdAt" DESC);

CREATE INDEX "agent_events_targetAgent_processed_createdAt_idx" ON "agent_events"("targetAgent", "processed", "createdAt");
CREATE INDEX "agent_events_eventType_processed_idx" ON "agent_events"("eventType", "processed");

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
