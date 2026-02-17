-- Data migration: remove project-scoped permissions from global roles.
-- Access to tasks, lists, comments, attachments and tags is now governed
-- exclusively by ProjectMember roles (OWNER / MANAGER / EDITOR / VIEWER).

-- Step 1: Unlink project-scoped permissions from all roles
DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT id FROM "Permission"
  WHERE resource IN ('tasks', 'lists', 'comments', 'attachments', 'tags')
);

-- Step 2: Delete the project-scoped Permission records
DELETE FROM "Permission"
WHERE resource IN ('tasks', 'lists', 'comments', 'attachments', 'tags');
