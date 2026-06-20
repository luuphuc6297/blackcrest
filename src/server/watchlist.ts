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

/** All active symbols, for the add-to-watchlist picker (client-filtered). */
export async function listWatchableSymbols(): Promise<WatchableSymbol[]> {
  return prisma.symbol.findMany({
    where: { isActive: true },
    orderBy: { ticker: "asc" },
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
