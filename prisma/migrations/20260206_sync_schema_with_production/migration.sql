-- Migration: Sync schema with production database
-- This migration adds columns that were added to production but not tracked in migrations

-- Add technicalNotes column to Task table (for acceptance criteria or technical details)
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "technicalNotes" TEXT;

-- Add remainingRequests and remainingTokens to AiUsageLog table (provider snapshot data)
ALTER TABLE "AiUsageLog" ADD COLUMN IF NOT EXISTS "remainingRequests" INTEGER;
ALTER TABLE "AiUsageLog" ADD COLUMN IF NOT EXISTS "remainingTokens" INTEGER;
