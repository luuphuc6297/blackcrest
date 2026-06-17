-- CreateTable
CREATE TABLE "DownloadToken" (
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadToken_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "DownloadToken_expiresAt_idx" ON "DownloadToken"("expiresAt");
