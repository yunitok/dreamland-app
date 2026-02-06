-- Migration: Refactor TaskStatus from per-project to global model
-- Applied: 2026-02-06
-- This migration makes TaskStatus global (shared across all projects) instead of per-project

-- Step 1: Map tasks from duplicate statuses to primary global IDs
-- (Already executed - Tasks pointing to duplicate statuses were updated to use one per name)

-- Step 2: Delete duplicate statuses (kept 7 unique global statuses)
-- IDs kept:
-- 449a39c0-166e-4ad7-a5b5-4400ff15a153 (Backlog, pos:0)
-- cmla90ees000070uk8m4mimny (To Do, pos:1)
-- cmla90ehc000170ukzug3bxve (In Progress, pos:2)
-- 185ea500-f579-4205-91af-7f311541f914 (In Review, pos:3)
-- 4ed75660-bf8e-410b-a0cc-c78830f6352c (On Hold, pos:4)
-- 5f04a2a9-01b5-4073-b241-b1f7e9bd399f (Blocked, pos:5)
-- cmla90ehc000270uk8l20v4cn (Done, pos:6)

-- Step 3: Drop constraints
ALTER TABLE "TaskStatus" DROP CONSTRAINT IF EXISTS "TaskStatus_projectId_name_key";
ALTER TABLE "TaskStatus" DROP CONSTRAINT IF EXISTS "TaskStatus_projectId_fkey";

-- Step 4: Drop projectId column
ALTER TABLE "TaskStatus" DROP COLUMN IF EXISTS "projectId";

-- Step 5: Add unique constraint on name only
ALTER TABLE "TaskStatus" ADD CONSTRAINT "TaskStatus_name_key" UNIQUE ("name");
