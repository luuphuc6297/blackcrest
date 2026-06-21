-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EARNINGS', 'RESULT', 'AGM', 'AGM_EXTRA', 'INVESTOR_MEETING', 'COMPANY', 'COMPANY_VISIT', 'INITIATION', 'LISTING', 'IPO', 'BOND', 'DROP_COVERAGE', 'VIEW', 'PHTT');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('BUY', 'HOLD', 'SELL', 'REDUCE', 'ADD');

-- CreateEnum
CREATE TYPE "ReportTier" AS ENUM ('FULL', 'FLASH');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('CLIENT', 'INTERNAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_INVITE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_ROLE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_ACCESS';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_TAG_ADD';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_TAG_REMOVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_INGEST';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_NOTIFY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'INVITED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'UNVERIFIED';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "audience" "Audience" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN IF NOT EXISTS "contentText" TEXT,
ADD COLUMN IF NOT EXISTS "recommendation" "Recommendation",
ADD COLUMN IF NOT EXISTS "reportDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reportType" "ReportType",
ADD COLUMN IF NOT EXISTS "tier" "ReportTier";

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT,
ADD COLUMN IF NOT EXISTS "watchlistEmails" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Symbol" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "exchange" TEXT,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameZh" TEXT,
    "sector" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportSymbol" (
    "reportId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReportSymbol_pkey" PRIMARY KEY ("reportId","symbolId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IngestBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "filesSeen" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "needsReview" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IngestBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IngestIssue" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "rawCode" TEXT,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportNotification" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'CLIENT',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Symbol_ticker_key" ON "Symbol"("ticker");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSymbol_symbolId_idx" ON "ReportSymbol"("symbolId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IngestIssue_batchId_resolved_idx" ON "IngestIssue"("batchId", "resolved");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WatchlistItem_symbolId_idx" ON "WatchlistItem"("symbolId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistItem_userId_symbolId_key" ON "WatchlistItem"("userId", "symbolId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportNotification_userId_idx" ON "ReportNotification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReportNotification_reportId_userId_channel_key" ON "ReportNotification"("reportId", "userId", "channel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportAttachment_reportId_idx" ON "ReportAttachment"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReportAttachment_reportId_sha256_key" ON "ReportAttachment"("reportId", "sha256");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_reportType_publishedAt_idx" ON "Report"("reportType", "publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_recommendation_idx" ON "Report"("recommendation");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

-- AddForeignKey
ALTER TABLE "ReportSymbol" ADD CONSTRAINT "ReportSymbol_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSymbol" ADD CONSTRAINT "ReportSymbol_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestIssue" ADD CONSTRAINT "IngestIssue_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IngestBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportNotification" ADD CONSTRAINT "ReportNotification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportNotification" ADD CONSTRAINT "ReportNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttachment" ADD CONSTRAINT "ReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttachment" ADD CONSTRAINT "ReportAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

