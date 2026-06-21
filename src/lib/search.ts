import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The SearchIndex seam (blueprint §F1). Maps a free-text query to report IDs
 * ranked best-first, with DELIBERATELY NO entitlement — the caller
 * (authz.searchReports) MUST intersect these IDs with visibleWhere(). This is the
 * only place search-engine specifics live, so it can be swapped wholesale.
 *
 * Driver is chosen by SEARCH_DRIVER ("postgres" default | "meili"):
 *  - postgres: Postgres FTS over the SMALL per-translation "searchTsv"
 *    (title + summary + author; see prisma/sql/report-fts.sql). Ranking the full
 *    PDF body (Report.contentTsv) seq-scanned ~200MB for frequent terms (~15s →
 *    Vercel timeout); the small vector is ~12ms and matches what users type
 *    (company names + tickers live in titles). Diacritic-insensitive via
 *    f_unaccent; websearch_to_tsquery handles quoted phrases / -negation.
 *  - meili: Meilisearch (typo-tolerant, scales past Postgres FTS). Drop-in: set
 *    SEARCH_DRIVER=meili + MEILI_HOST, `pnpm add meilisearch`, and keep the index
 *    in sync (see the indexing contract on `meili` below). Read side already works.
 */
export interface SearchIndex {
  /** Ranked report IDs for `q` (best-first), capped at `limit`. No entitlement. */
  search(q: string, limit: number): Promise<string[]>;
}

const postgres: SearchIndex = {
  async search(q, limit) {
    const term = q.trim();
    if (!term) return [];
    // Match any locale's translation; rank a report by its best-matching
    // translation, tie-break by recency. GIN(searchTsv) → bitmap index scan.
    // websearch_to_tsquery is inlined in both WHERE and ORDER BY (not bound via a
    // cross-join): its arg is constant-folded so the second parse is negligible,
    // and inlining keeps the planner on the GIN bitmap scan.
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id
      FROM "Report" r
      JOIN "ReportTranslation" t ON t."reportId" = r.id
      WHERE t."searchTsv" @@ websearch_to_tsquery('simple', f_unaccent(${term}))
      GROUP BY r.id
      ORDER BY
        MAX(ts_rank(t."searchTsv", websearch_to_tsquery('simple', f_unaccent(${term})))) DESC,
        r."publishedAt" DESC NULLS LAST
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  },
};

/**
 * Meilisearch driver — READ side is implemented; enable with SEARCH_DRIVER=meili
 * + MEILI_HOST (+ optional MEILI_KEY / MEILI_INDEX) after `pnpm add meilisearch`.
 *
 * INDEXING CONTRACT (must be wired before switching): keep one document per report
 *   { id, title, summary, author, tickers: string[], publishedAt }
 * with searchable attributes [title, summary, author, tickers] and the ranking
 * rule biased to recency. Sync on the report lifecycle — upsert on publish/edit,
 * delete on report-delete (the natural home is src/server/report-actions.ts, right
 * where the DB write happens). Until that sync exists, search() returns whatever
 * the index holds, so do NOT flip SEARCH_DRIVER in prod before backfilling.
 */
const meili: SearchIndex = {
  async search(q, limit) {
    const term = q.trim();
    if (!term) return [];
    const host = process.env.MEILI_HOST;
    if (!host) throw new Error("SEARCH_DRIVER=meili but MEILI_HOST is not set");
    // Optional peer dep: imported via a variable specifier so typecheck/bundling
    // don't require the package until the driver is actually selected.
    const pkg = "meilisearch";
    const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ pkg)) as {
      MeiliSearch: new (opts: { host: string; apiKey?: string }) => {
        index: (name: string) => {
          search: (
            query: string,
            opts: { limit: number; attributesToRetrieve: string[] },
          ) => Promise<{ hits: Array<{ id: string }> }>;
        };
      };
    };
    const client = new mod.MeiliSearch({ host, apiKey: process.env.MEILI_KEY });
    const res = await client
      .index(process.env.MEILI_INDEX ?? "reports")
      .search(term, { limit, attributesToRetrieve: ["id"] });
    return res.hits.map((h) => h.id);
  },
};

function getSearchIndex(): SearchIndex {
  return process.env.SEARCH_DRIVER === "meili" ? meili : postgres;
}

export function searchReportIds(q: string, limit = 400): Promise<string[]> {
  return getSearchIndex().search(q, limit);
}
