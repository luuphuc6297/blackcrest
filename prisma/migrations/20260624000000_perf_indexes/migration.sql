-- Performance indexes (AUDIT-perf-e2e-2026-06-24).
-- Tables are small (~5.7k Report / ReportTranslation rows) so plain CREATE INDEX
-- locks only briefly; IF [NOT] EXISTS keeps this idempotent across environments.

-- The client browse gate (visibleWhere) ALWAYS filters status='PUBLISHED' AND
-- audience='CLIENT' before the (publishedAt, id) keyset sort. The old index
-- omitted `audience`, so the planner filtered those rows out post-index. Replace
-- it with a 4-column index that leads on both equality columns.
DROP INDEX IF EXISTS "Report_status_publishedAt_id_idx";
CREATE INDEX IF NOT EXISTS "Report_status_audience_publishedAt_id_idx"
  ON "Report" ("status", "audience", "publishedAt", "id");

-- Admin Reports table: ORDER BY updatedAt DESC (take 500) was an unindexed
-- seq-scan + sort over the whole catalog.
CREATE INDEX IF NOT EXISTS "Report_updatedAt_idx" ON "Report" ("updatedAt");

-- Library alphabetical sort: ORDER BY (locale, title) was a full ReportTranslation
-- seq-scan + external heapsort on every A–Z / Z–A toggle.
CREATE INDEX IF NOT EXISTS "ReportTranslation_locale_title_idx"
  ON "ReportTranslation" ("locale", "title");

-- Drop the DEAD full-body FTS apparatus: search ranks the small per-translation
-- searchTsv, never this generated full-PDF-body vector + ~91MB GIN, which were
-- still maintained on every ingest write. (Also dropped in prisma/sql/report-fts.sql
-- for the db-push path; both are idempotent.) Drop the GIN before its column.
DROP INDEX IF EXISTS report_contenttsv_gin;
ALTER TABLE "Report" DROP COLUMN IF EXISTS "contentTsv";
