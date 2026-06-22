import "server-only";
import type {
  Prisma,
  Role,
  ReportType,
  Recommendation,
  ReportTier,
  AccessLevel,
  Audience,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaff, STAFF_ROLES } from "@/lib/rbac";
import { searchReportIds } from "@/lib/search";

/**
 * THE single authorization function for report visibility (blueprint §F2, §6.1).
 * Call from EVERY RSC / Server Action / Route Handler that touches a report.
 *
 * Non-staff visibility = report is PUBLISHED AND (PUBLIC OR an entitlement exists
 * for one of the user's groups, at the report OR its category). Expressed with
 * Prisma `some` (compiles to correlated EXISTS — no JOIN-then-DISTINCT row
 * duplication when a user is in multiple groups).
 */
export async function canViewReport(
  userId: string,
  role: Role,
  reportId: string,
): Promise<boolean> {
  if (isStaff(role)) return true; // staff bypass — explicit, never implicit

  const hit = await prisma.report.findFirst({
    where: { id: reportId, ...visibleWhere(userId) },
    select: { id: true },
  });
  return hit !== null;
}

/** The reusable WHERE fragment for "reports this client may see".
 * LOCKSTEP: listWatchersToNotify() below mirrors this exact predicate (audience +
 * entitlement) as a USER/report filter — any change here (new entitlement path,
 * the audience gate…) MUST be reflected there, or the watchlist fan-out diverges
 * from visibility. */
function visibleWhere(userId: string): Prisma.ReportWhereInput {
  const memberOf = { group: { members: { some: { userId } } } };
  return {
    status: "PUBLISHED",
    // INTERNAL = staff-only forever (schema §Audience). Clients NEVER see it, even
    // if it is PUBLIC or carries an entitlement — staff bypass visibleWhere entirely.
    audience: "CLIENT",
    OR: [
      { accessLevel: "PUBLIC" },
      { entitlements: { some: memberOf } }, // group → report
      { category: { entitlements: { some: memberOf } } }, // group → category
    ],
  };
}

export type WatcherToNotify = {
  id: string;
  email: string;
  name: string;
  unsubscribeToken: string | null;
};

/**
 * F2: the watchers ENTITLED to be notified that report R was published. The
 * entitlement predicate is the SAME truth as visibleWhere (PUBLIC ∪ group→report
 * ∪ group→category, with staff bypass), only expressed as a USER filter — so the
 * notify fan-out can never reach someone who couldn't open the report. Also drops
 * opted-out users (watchlistEmails=false) and anyone already notified on this
 * (report, channel). This is a PRE-FILTER, never a second visibility path.
 * LOCKSTEP: keep the entitlement branches identical to visibleWhere() above.
 */
export async function listWatchersToNotify(
  report: { id: string; categoryId: string; accessLevel: AccessLevel; audience: Audience },
  symbolIds: string[],
  channel = "EMAIL",
): Promise<WatcherToNotify[]> {
  if (symbolIds.length === 0) return [];
  // LOCKSTEP with visibleWhere: an INTERNAL report is staff-only — never fan out
  // client notifications for it (clients could not open it anyway).
  if (report.audience === "INTERNAL") return [];

  const entitled: Prisma.UserWhereInput =
    report.accessLevel === "PUBLIC"
      ? {} // every approved user qualifies
      : {
          OR: [
            { role: { in: STAFF_ROLES } }, // staff bypass — mirrors isStaff()
            {
              memberships: {
                some: {
                  group: {
                    entitlements: {
                      some: {
                        OR: [{ reportId: report.id }, { categoryId: report.categoryId }],
                      },
                    },
                  },
                },
              },
            },
          ],
        };

  return prisma.user.findMany({
    where: {
      status: "APPROVED",
      watchlistEmails: true,
      watchlistItems: { some: { symbolId: { in: symbolIds } } },
      notifications: { none: { reportId: report.id, channel } },
      ...entitled,
    },
    select: { id: true, email: true, name: true, unsubscribeToken: true },
  });
}

/**
 * F2: entitlement-correct count of reports the user may see, per symbol (for the
 * watchlist rows). Counts through the SAME visibleWhere gate via the
 * ReportSymbol → report relation, so a RESTRICTED report never inflates a count
 * for a user who couldn't open it.
 */
export async function countVisibleReportsBySymbols(
  userId: string,
  role: Role,
  symbolIds: string[],
): Promise<Record<string, number>> {
  if (symbolIds.length === 0) return {};
  const reportWhere: Prisma.ReportWhereInput = isStaff(role)
    ? { status: "PUBLISHED" }
    : visibleWhere(userId);
  const rows = await prisma.reportSymbol.groupBy({
    by: ["symbolId"],
    where: { symbolId: { in: symbolIds }, report: reportWhere },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.symbolId] = r._count._all;
  return out;
}

export type VisibleReport = Awaited<
  ReturnType<typeof listVisibleReports>
>["items"][number];

/**
 * Paginated list of reports a user may see, with translations resolved in the
 * app layer (requested → vi → any) so reports missing a translation never
 * vanish (blueprint §F4). Keyset pagination on (publishedAt, id).
 */
export async function listVisibleReports(opts: {
  userId: string;
  role: Role;
  locale: string;
  take?: number;
  cursor?: string | null;
  categorySlug?: string | null;
  q?: string | null;
}) {
  const { userId, role, locale, take = 12, cursor, categorySlug, q } = opts;

  const where: Prisma.ReportWhereInput = isStaff(role)
    ? { status: "PUBLISHED" }
    : visibleWhere(userId);
  if (categorySlug) where.category = { ...(where.category as object), slug: categorySlug };
  const term = q?.trim();
  if (term) {
    where.translations = {
      some: {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
        ],
      },
    };
  }

  const rows = await prisma.report.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { translations: true, category: true },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  const items = page.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    accessLevel: r.accessLevel,
    publishedAt: r.publishedAt,
    pageCount: r.pageCount,
    coverLabel: r.coverLabel,
    category: r.category,
    ...resolveTranslation(r.translations, locale),
  }));

  return { items, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null };
}

export type SearchedReport = {
  id: string;
  slug: string;
  status: Prisma.ReportGetPayload<object>["status"];
  accessLevel: Prisma.ReportGetPayload<object>["accessLevel"];
  publishedAt: Date | null;
  reportType: ReportType | null;
  recommendation: Recommendation | null;
  tier: ReportTier | null;
  reportDate: Date | null;
  pageCount: number | null;
  coverLabel: string | null;
  tickers: string[];
  title: string;
  summary: string | null;
  author: string | null;
};

export type ReportFacets = {
  reportType: { value: string; count: number }[];
  recommendation: { value: string; count: number }[];
  tier: { value: string; count: number }[];
};

/** The relations a report CARD needs (translations for the title, symbols for tickers). */
export const REPORT_CARD_INCLUDE = {
  translations: true,
  symbols: { include: { symbol: true } },
} as const;
export type ReportRowWithRel = Prisma.ReportGetPayload<{ include: typeof REPORT_CARD_INCLUDE }>;

/** Map a DB row (with card relations) to the client-facing SearchedReport shape. */
export function toSearchedReport(r: ReportRowWithRel, locale: string): SearchedReport {
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    accessLevel: r.accessLevel,
    publishedAt: r.publishedAt,
    reportType: r.reportType,
    recommendation: r.recommendation,
    tier: r.tier,
    reportDate: r.reportDate,
    pageCount: r.pageCount,
    coverLabel: r.coverLabel,
    tickers: r.symbols.map((s) => s.symbol.ticker),
    ...resolveTranslation(r.translations, locale),
  };
}

export type ReportSection = { key: string; reportType: ReportType | null; reports: SearchedReport[] };

/**
 * F1 landing: a handful of curated sections (Latest + top report types), each the
 * N most-recent reports the user may see. Cheap by design — every section is an
 * indexed `take N` (Report_reportType_publishedAt / Report_status_publishedAt_id),
 * run in PARALLEL, with NO facet groupBy/count. This is the fast default view; the
 * heavier searchReports (facets + full grid) only runs once the user filters.
 */
const SECTION_TYPES: (ReportType | null)[] = [
  null, // "Mới nhất" — newest across all types
  "EARNINGS",
  "RESULT",
  "AGM",
  "COMPANY",
  "INVESTOR_MEETING",
  "INITIATION",
];

export async function listReportSections(opts: {
  userId: string;
  role: Role;
  locale: string;
  perSection?: number;
}): Promise<ReportSection[]> {
  const { userId, role, locale, perSection = 12 } = opts;
  const base: Prisma.ReportWhereInput = isStaff(role)
    ? { status: "PUBLISHED" }
    : visibleWhere(userId);

  const sections = await Promise.all(
    SECTION_TYPES.map(async (rt) => {
      const where: Prisma.ReportWhereInput = rt ? { AND: [base, { reportType: rt }] } : base;
      const rows = await prisma.report.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: perSection,
        include: REPORT_CARD_INCLUDE,
      });
      return { key: rt ?? "latest", reportType: rt, reports: rows.map((r) => toSearchedReport(r, locale)) };
    }),
  );
  // Drop empty sections (e.g. a type the user has no entitlement for).
  return sections.filter((s) => s.reports.length > 0);
}

/** Sort order for the browse/filtered grid (ignored when a text query `q` is set —
 * those stay relevance-ranked). "az"/"za" order by the vi title. */
export type ReportSort = "date" | "date-asc" | "az" | "za";

/**
 * F1 search/facet over reports. Full-text `q` is diacritic-insensitive (the
 * SearchIndex seam returns ranked IDs which are then AND-intersected with the
 * SAME visibleWhere gate — search is a PRE-FILTER, never a second visibility
 * path). Facets are counted within the current (entitlement + filter) set.
 */
export async function searchReports(opts: {
  userId: string;
  role: Role;
  locale: string;
  q?: string | null;
  reportType?: string[] | null;
  recommendation?: string[] | null;
  tier?: string | null;
  symbol?: string | null;
  take?: number;
  sort?: ReportSort;
}): Promise<{
  items: SearchedReport[];
  hasMore: boolean;
  total: number;
  capped: boolean;
  facets: ReportFacets;
}> {
  const { userId, role, locale, q, reportType, recommendation, tier, symbol, take = 24, sort = "date" } = opts;
  const FTS_LIMIT = 400;

  const and: Prisma.ReportWhereInput[] = [
    isStaff(role) ? { status: "PUBLISHED" } : visibleWhere(userId),
  ];
  if (reportType?.length) and.push({ reportType: { in: reportType as ReportType[] } });
  if (recommendation?.length) and.push({ recommendation: { in: recommendation as Recommendation[] } });
  if (tier) and.push({ tier: tier as ReportTier });
  if (symbol) and.push({ symbols: { some: { symbol: { ticker: symbol.toUpperCase() } } } });

  const term = q?.trim();
  let rankOrder: string[] | null = null;
  if (term) {
    rankOrder = await searchReportIds(term, FTS_LIMIT);
    // Empty match → an impossible id so the rest of the pipeline returns nothing.
    and.push({ id: { in: rankOrder.length ? rankOrder : ["__no_match__"] } });
  }
  const where: Prisma.ReportWhereInput = { AND: and };
  const include = REPORT_CARD_INCLUDE;
  const mapRow = (r: ReportRowWithRel) => toSearchedReport(r, locale);
  // Tally a facet from rows already in memory (search path).
  const tally = (
    rows: { reportType: ReportType | null; recommendation: Recommendation | null; tier: ReportTier | null }[],
    key: "reportType" | "recommendation" | "tier",
  ) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = r[key];
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  };

  let items: SearchedReport[];
  let total: number;
  let facets: ReportFacets;

  if (term && rankOrder) {
    // SEARCH PATH: one light scan of the surviving candidates (≤ FTS_LIMIT rows,
    // scalar columns only) yields facets + total + page selection in JS — no
    // separate groupBy/count round-trips. Then fetch the heavy includes for ONLY
    // the `take` page rows. (Previously: 3 groupBy + count + a 400-row findMany
    // WITH includes per keystroke = the ~15s search.)
    const rank = new Map(rankOrder.map((id, i) => [id, i]));
    const survivors = await prisma.report.findMany({
      where,
      select: { id: true, reportType: true, recommendation: true, tier: true },
    });
    total = survivors.length;
    facets = {
      reportType: tally(survivors, "reportType"),
      recommendation: tally(survivors, "recommendation"),
      tier: tally(survivors, "tier"),
    };
    const pageIds = survivors
      .map((s) => s.id)
      .sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9))
      .slice(0, take);
    // Re-apply the FULL gate (not just id ∈ pageIds) so this read literally
    // satisfies the visibleWhere invariant instead of relying on pageIds being a
    // pre-vetted subset — defence in depth, negligible cost (≤ take ids).
    const rows = await prisma.report.findMany({
      where: { AND: [where, { id: { in: pageIds } }] },
      include,
    });
    rows.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
    items = rows.map(mapRow);
  } else {
    // BROWSE PATH: facets span the whole visible set (too large to pull into JS),
    // so count them with DB groupBy; the page is the first `take` per `sort`.
    // A→Z/Z→A order by the vi title (held in ReportTranslation), so that page is
    // fetched FROM the translation table; date orders the Report rows directly.
    const fetchPage = async (): Promise<ReportRowWithRel[]> => {
      if (sort === "az" || sort === "za") {
        const trs = await prisma.reportTranslation.findMany({
          where: { locale: "vi", report: where },
          orderBy: { title: sort === "za" ? "desc" : "asc" },
          take,
          select: { report: { include } },
        });
        return trs.map((t) => t.report);
      }
      return prisma.report.findMany({
        where,
        orderBy:
          sort === "date-asc" ? [{ publishedAt: "asc" }, { id: "asc" }] : [{ publishedAt: "desc" }, { id: "desc" }],
        take, // grow-on-"load more" (accumulate from the top), no cursor
        include,
      });
    };
    const [byType, byRec, byTier, count, rows] = await Promise.all([
      prisma.report.groupBy({ by: ["reportType"], where, _count: { _all: true } }),
      prisma.report.groupBy({ by: ["recommendation"], where, _count: { _all: true } }),
      prisma.report.groupBy({ by: ["tier"], where, _count: { _all: true } }),
      prisma.report.count({ where }),
      fetchPage(),
    ]);
    total = count;
    facets = {
      reportType: byType
        .filter((x) => x.reportType)
        .map((x) => ({ value: x.reportType as string, count: x._count._all }))
        .sort((a, b) => b.count - a.count),
      recommendation: byRec
        .filter((x) => x.recommendation)
        .map((x) => ({ value: x.recommendation as string, count: x._count._all }))
        .sort((a, b) => b.count - a.count),
      tier: byTier
        .filter((x) => x.tier)
        .map((x) => ({ value: x.tier as string, count: x._count._all }))
        .sort((a, b) => b.count - a.count),
    };
    items = rows.map(mapRow);
  }

  return {
    items,
    hasMore: items.length < total,
    total,
    // The FTS pre-filter is capped at FTS_LIMIT ranked ids; if it filled, more
    // matches likely exist beyond what we ranked, so the count is a floor ("400+").
    capped: !!term && (rankOrder?.length ?? 0) >= FTS_LIMIT,
    facets,
  };
}

/** Resolve a report's display fields with the requested → vi → any fallback. */
export function resolveTranslation(
  translations: { locale: string; title: string; summary: string | null; author: string | null }[],
  locale: string,
) {
  const pick =
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === "vi") ??
    translations[0];
  return {
    title: pick?.title ?? "(không có tiêu đề)",
    summary: pick?.summary ?? null,
    author: pick?.author ?? null,
  };
}
