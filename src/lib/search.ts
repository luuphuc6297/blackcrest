import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Diacritic-insensitive full-text match over a report's extracted PDF text.
 * Returns report IDs ranked by relevance — and DELIBERATELY applies NO
 * entitlement: the caller (authz.searchReports) MUST intersect these IDs with
 * visibleWhere(). This is the SearchIndex seam (today: Postgres FTS; swappable
 * to Meilisearch later) — the only place raw FTS SQL lives.
 *
 * Matches AND ranks against the stored "contentTsv" generated column + its GIN
 * index (prisma/sql/report-fts.sql) so to_tsvector is never recomputed at query
 * time. websearch_to_tsquery handles quoted phrases / -negation.
 */
export async function searchReportIds(q: string, limit = 400): Promise<string[]> {
  const term = q.trim();
  if (!term) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT r.id
    FROM "Report" r, websearch_to_tsquery('simple', f_unaccent(${term})) AS query
    WHERE r."contentTsv" @@ query
    ORDER BY ts_rank(r."contentTsv", query) DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}
