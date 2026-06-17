-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_LOCKED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);
