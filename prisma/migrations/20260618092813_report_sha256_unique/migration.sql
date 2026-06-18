-- DropIndex
DROP INDEX "Report_fileSha256_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Report_fileSha256_key" ON "Report"("fileSha256");

