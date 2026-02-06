-- Move all unassigned tasks from non-Backlog statuses to Backlog
-- This enforces the business rule: tasks without assignee must be in Backlog

-- Step 1: Get Backlog status ID (we'll use a variable approach)
DO $$
DECLARE
  backlog_status_id VARCHAR;
BEGIN
  -- Find the Backlog status ID
  SELECT id INTO backlog_status_id
  FROM "TaskStatus"
  WHERE name = 'Backlog'
  LIMIT 1;

  -- If Backlog doesn't exist, raise an error
  IF backlog_status_id IS NULL THEN
    RAISE EXCEPTION 'Backlog status not found. Please seed global statuses first.';
  END IF;

  -- Update all tasks that:
  -- 1. Have no assignee (assigneeId IS NULL)
  -- 2. Are NOT in Backlog status
  -- 3. Are NOT in a closed status
  UPDATE "Task"
  SET "statusId" = backlog_status_id
  WHERE "assigneeId" IS NULL
    AND "statusId" IN (
      SELECT id FROM "TaskStatus"
      WHERE name != 'Backlog'
        AND "isClosed" = false
    );

  -- Log the number of affected rows
  RAISE NOTICE 'Moved % unassigned tasks to Backlog', (
    SELECT COUNT(*)
    FROM "Task"
    WHERE "assigneeId" IS NULL
      AND "statusId" = backlog_status_id
  );
END $$;
