-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SherlockAudit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "projectId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SherlockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SherlockAudit_projectId_idx" ON "SherlockAudit"("projectId");

-- CreateIndex
CREATE INDEX "SherlockAudit_authorId_idx" ON "SherlockAudit"("authorId");

-- AddForeignKey
ALTER TABLE "SherlockAudit" ADD CONSTRAINT "SherlockAudit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SherlockAudit" ADD CONSTRAINT "SherlockAudit_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
