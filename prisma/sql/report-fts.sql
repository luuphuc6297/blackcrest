-- Full-text search index for Report.contentText (F1).
-- Prisma can't express a STORED generated tsvector / GIN over a function, so this
-- is applied as raw SQL (run on every environment; idempotent).
--
-- Apply:  psql "$DIRECT_URL" -f prisma/sql/report-fts.sql
--   (local dev: docker exec -i blackcrest-dev-db psql -U blackcrest -d blackcrest < prisma/sql/report-fts.sql)
--
-- NOTE: `contentTsv` is intentionally NOT in schema.prisma. `prisma db push`
-- drops columns it doesn't know about, so re-run this file after any push (prod
-- uses a migration that wraps this SQL, where it is never dropped).

CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is STABLE (depends on the dictionary), so it can't be used in an
-- index/generated expression directly. Wrap it IMMUTABLE — the dictionary is fixed in prod.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  SET search_path = public, pg_catalog
  AS $func$ SELECT public.unaccent('public.unaccent', $1) $func$;

-- DEAD full-body FTS apparatus — REMOVED (AUDIT-perf-e2e-2026-06-24).
-- src/lib/search.ts ranks against the SMALL per-translation "searchTsv" below,
-- never the full-PDF-body "contentTsv" (ranking the body seq-scanned ~200MB for
-- common terms → ~15s, which is exactly why the search was moved to searchTsv).
-- The generated "contentTsv" column + its ~91MB GIN were still recomputed on every
-- ingest insert/update for nothing. Drop both — idempotent; drop the GIN before
-- the column it depends on.
DROP INDEX IF EXISTS report_contenttsv_gin;
ALTER TABLE "Report" DROP COLUMN IF EXISTS "contentTsv";

-- Superseded long ago by the per-translation searchTsv index.
DROP INDEX IF EXISTS report_contenttext_fts;

-- "Small search vector": title + summary + author per ReportTranslation. The
-- library search box ranks against THIS (tiny) vector, not the full-PDF-body
-- "contentTsv" (ranking that seq-scanned ~200MB for frequent terms → ~15s). Also
-- a STORED generated column → auto-maintained, never stale. See migration
-- 20260621101400_search_tsv_translation.
ALTER TABLE "ReportTranslation"
  ADD COLUMN IF NOT EXISTS "searchTsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      f_unaccent(coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(author, ''))
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS reporttranslation_searchtsv_gin
  ON "ReportTranslation" USING GIN ("searchTsv");
