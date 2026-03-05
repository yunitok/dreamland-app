-- DropForeignKey
ALTER TABLE "email_replies" DROP CONSTRAINT "email_replies_sentBy_fkey";

-- AlterTable
ALTER TABLE "email_replies" ALTER COLUMN "sentBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "email_replies" ADD CONSTRAINT "email_replies_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
