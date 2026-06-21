-- "Small search vector" for the library search box (F1).
--
-- The free-text search used to rank against Report.contentTsv = the FULL extracted
-- PDF body (a huge tsvector). A frequent term ("lợi nhuận") matches ~all reports,
-- so ts_rank seq-scanned ~200MB of tsvectors → ~15s and a Vercel function timeout.
--
-- This indexes only title + summary + author per ReportTranslation — a TINY vector
-- that stays fast to rank even on a cold cache, and matches what users actually type
-- (company names / tickers appear in titles). It's a STORED generated column, so it
-- is auto-maintained by Postgres (no triggers, no app writes, never stale).
--
-- Live-safe (IF NOT EXISTS) + portable: f_unaccent (IMMUTABLE) is created earlier in
-- 20260621101100_fts_contenttsv. NOTE: "searchTsv" is intentionally NOT in
-- schema.prisma (Prisma can't express a STORED generated tsvector); `prisma db push`
-- would drop it, so local dev re-applies prisma/sql/report-fts.sql after a push.

ALTER TABLE "ReportTranslation"
  ADD COLUMN IF NOT EXISTS "searchTsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      f_unaccent(coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(author, ''))
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS reporttranslation_searchtsv_gin
  ON "ReportTranslation" USING GIN ("searchTsv");
