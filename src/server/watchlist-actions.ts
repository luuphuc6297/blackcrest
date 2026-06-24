"use server";

import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFreshUser } from "@/lib/rbac";
import { sendMail, buildWatchlistEmail, getAppUrl } from "@/lib/mailer";

export type WatchResult =
  | { ok: true; watching: boolean }
  | { ok: false; error: string };

const schema = z.object({
  symbolId: z.string().cuid(),
  watching: z.boolean(),
});

/**
 * Add/remove a symbol from the caller's watchlist (F2). Idempotent: re-watching
 * an already-watched symbol or un-watching a non-watched one both succeed. Uses
 * the FRESH DB re-check (a suspended account can't mutate within the JWT window).
 */
export async function setWatch(input: {
  symbolId: string;
  watching: boolean;
}): Promise<WatchResult> {
  let user;
  try {
    user = await requireFreshUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để theo dõi mã." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const { symbolId, watching } = parsed.data;

  const symbol = await prisma.symbol.findFirst({
    where: { id: symbolId, isActive: true },
    select: { id: true, ticker: true, nameVi: true },
  });
  if (!symbol) return { ok: false, error: "Không tìm thấy mã chứng khoán." };

  if (watching) {
    // Send the confirmation only the FIRST time this user watches the symbol —
    // re-toggling an already-watched one must not re-email.
    const already = await prisma.watchlistItem.findUnique({
      where: { userId_symbolId: { userId: user.id, symbolId } },
      select: { id: true },
    });
    await prisma.watchlistItem.upsert({
      where: { userId_symbolId: { userId: user.id, symbolId } },
      create: { userId: user.id, symbolId },
      update: {},
    });
    if (!already) {
      // Deferred (after the response) so a slow SMTP never blocks the toggle;
      // any failure is swallowed — a missed confirmation must not fail the watch.
      after(async () => {
        try {
          const u = await prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true, name: true },
          });
          if (!u?.email) return;
          const url = `${getAppUrl()}/vi/watchlist`;
          const mail = buildWatchlistEmail({
            subject: `Đã thêm ${symbol.ticker} vào danh mục theo dõi`,
            heading: `Bạn đang theo dõi ${symbol.ticker}`,
            intro: `Chào ${u.name ?? "bạn"}, bạn vừa thêm mã này vào danh mục theo dõi. Chúng tôi sẽ gửi email ngay khi có báo cáo mới liên quan.`,
            tickers: symbol.ticker,
            reportTitle: symbol.nameVi,
            buttonLabel: "Mở danh mục theo dõi",
            url,
            unsubscribeNote: "Quản lý danh mục theo dõi tại",
            unsubscribeLabel: "đây",
            unsubscribeUrl: url,
          });
          await sendMail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text });
        } catch (e) {
          console.error("[watch] confirmation email failed", e);
        }
      });
    }
  } else {
    await prisma.watchlistItem.deleteMany({ where: { userId: user.id, symbolId } });
  }

  revalidatePath("/[locale]/watchlist", "page");
  revalidatePath("/[locale]/reports/[slug]", "page");
  return { ok: true, watching };
}
