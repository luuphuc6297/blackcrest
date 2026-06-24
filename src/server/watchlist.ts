import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Watchlist read helpers (F2). Pure reads for RSC pages — mutations live in
 * watchlist-actions.ts ("use server"). The symbol catalogue itself is not
 * entitlement-sensitive (it is just tickers); report VISIBILITY is enforced
 * wherever reports are actually read (searchReports / countVisibleReportsBySymbols).
 */

export type WatchableSymbol = {
  id: string;
  ticker: string;
  nameVi: string;
  nameEn: string | null;
  nameZh: string | null;
};

/** All active symbols, for the add-to-watchlist picker (client-filtered).
 * Bounded by a safety `take`: the whole catalogue is shipped to the client for
 * in-memory filtering on two high-traffic routes (/reports, /watchlist), so an
 * unbounded scan + payload would grow with the market. 2000 is generous headroom
 * over the ~1,600 listed VN tickers; if the catalogue ever approaches it, move
 * this picker to a server-side typeahead (query on demand by ticker prefix). */
export async function listWatchableSymbols(): Promise<WatchableSymbol[]> {
  return prisma.symbol.findMany({
    where: { isActive: true },
    orderBy: { ticker: "asc" },
    take: 2000,
    select: { id: true, ticker: true, nameVi: true, nameEn: true, nameZh: true },
  });
}

/** The symbols a user watches (newest first). */
export async function getMyWatchlist(userId: string): Promise<WatchableSymbol[]> {
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      symbol: {
        select: { id: true, ticker: true, nameVi: true, nameEn: true, nameZh: true },
      },
    },
  });
  return items.map((i) => i.symbol);
}

/** The set of symbolIds a user watches — for toggle state on report surfaces. */
export async function getWatchedSymbolIds(userId: string): Promise<string[]> {
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    select: { symbolId: true },
  });
  return items.map((i) => i.symbolId);
}
