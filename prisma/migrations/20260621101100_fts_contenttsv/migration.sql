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
  AS $func$ SELECT public.unaccent('public.unaccent', $1) $func$;

-- Precompute the diacritic-folded tsvector ONCE per row and store it. Without
-- this, ts_rank() and the bitmap recheck recompute to_tsvector() over the (large)
-- extracted PDF text for every matched row — ~12s for a common term. Reading the
-- stored vector instead drops the same query to a few ms.
ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "contentTsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', f_unaccent(coalesce("contentText", '')))) STORED;

-- GIN over the stored vector. The query in src/lib/search.ts matches AND ranks
-- against "contentTsv" directly so nothing is recomputed at query time.
CREATE INDEX IF NOT EXISTS report_contenttsv_gin ON "Report" USING GIN ("contentTsv");

-- Superseded by the stored-column index above.
DROP INDEX IF EXISTS report_contenttext_fts;
