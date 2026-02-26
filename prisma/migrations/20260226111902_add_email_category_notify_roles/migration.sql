-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EMAIL_CROSS_DEPARTMENT';

-- AlterTable
ALTER TABLE "email_categories" ADD COLUMN     "notifyRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
