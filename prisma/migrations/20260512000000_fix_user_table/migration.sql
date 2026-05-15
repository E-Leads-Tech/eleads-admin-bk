-- AlterTable: add idCompany (missing from all previous migrations)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idCompany" TEXT;

-- AlterTable: drop role (was added in 20260304020042 but removed from schema)
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
