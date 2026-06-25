"use server";

import { prisma } from "@/lib/prisma";
import { requireFreshUser } from "@/lib/rbac";
import { reportVisibilityWhere, resolveTranslation } from "@/lib/authz";
import { searchReportIds } from "@/lib/search";

export type ReportSuggestion = {
  slug: string;
  title: string;
  reportType: string | null;
  ticker: string | null;
};

/**
 * Typeahead for the library search overlay — the "Báo cáo" group only. Symbols
 * and report-type labels are matched CLIENT-SIDE (preloaded catalogue + i18n enum
 * labels), so this round-trip is reserved for report TITLES, which live in the
 * 5.7k-row corpus and can't ship to the client.
 *
 * VISIBILITY-CRITICAL: searchReportIds() ranks by FTS with NO entitlement, so the
 * re-fetch AND-intersects the SAME reportVisibilityWhere() gate used everywhere —
 * a suggestion can never surface a title the caller couldn't open (incl. INTERNAL,
 * staff-only reports). Returns [] on any auth failure (the overlay degrades to its
 * client-side groups; it never throws into the keystroke path).
 */
export async function suggestReports(input: {
  q: string;
  locale: string;
}): Promise<ReportSuggestion[]> {
  let user;
  try {
    user = await requireFreshUser();
  } catch {
    return [];
  }

  const q = (input.q ?? "").trim();
  if (q.length < 2) return [];

  // Rank a small candidate set (typeahead, not the full 400-id search page).
  const ids = await searchReportIds(q, 24);
  if (ids.length === 0) return [];

  const rows = await prisma.report.findMany({
    where: { AND: [reportVisibilityWhere(user.id, user.role), { id: { in: ids } }] },
    select: {
      id: true,
      slug: true,
      reportType: true,
      translations: { select: { locale: true, title: true } },
      symbols: {
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { symbol: { select: { ticker: true } } },
      },
    },
  });

  // Re-apply the FTS rank order (the WHERE returns rows in DB order).
  const rank = new Map(ids.map((id, i) => [id, i] as const));
  rows.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));

  return rows.slice(0, 6).map((r) => ({
    slug: r.slug,
    title: resolveTranslation(r.translations, input.locale).title,
    reportType: r.reportType,
    ticker: r.symbols[0]?.symbol.ticker ?? null,
  }));
}
