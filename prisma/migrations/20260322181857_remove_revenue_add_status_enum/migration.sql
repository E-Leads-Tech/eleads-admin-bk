/*
  Warnings:

  - You are about to drop the column `revenue` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `idLeadStatus` on the `UserLead` table. All the data in the column will be lost.
  - You are about to drop the `LeadStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey (idempotent: already dropped by previous migration on fresh DBs)
ALTER TABLE "UserLead" DROP CONSTRAINT IF EXISTS "UserLead_idLeadStatus_fkey";

-- AlterTable
ALTER TABLE "UserLead" DROP COLUMN IF EXISTS "idLeadStatus";

-- DropTable
DROP TABLE IF EXISTS "LeadStatus";

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('completed', 'in_progress', 'pending', 'cancel', 'sale');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "revenue";
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "status" "LeadStatus" NOT NULL DEFAULT 'pending';
