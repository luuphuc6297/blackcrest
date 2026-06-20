"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFreshUser } from "@/lib/rbac";

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
    select: { id: true },
  });
  if (!symbol) return { ok: false, error: "Không tìm thấy mã chứng khoán." };

  if (watching) {
    await prisma.watchlistItem.upsert({
      where: { userId_symbolId: { userId: user.id, symbolId } },
      create: { userId: user.id, symbolId },
      update: {},
    });
  } else {
    await prisma.watchlistItem.deleteMany({ where: { userId: user.id, symbolId } });
  }

  revalidatePath("/[locale]/watchlist", "page");
  revalidatePath("/[locale]/reports/[slug]", "page");
  return { ok: true, watching };
}
