import "server-only";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { listWatchersToNotify, resolveTranslation } from "@/lib/authz";
import { watchlistEmailsEnabled } from "@/lib/flags";
import { sendMail, buildWatchlistEmail, getAppUrl } from "@/lib/mailer";
import { getOrCreateUnsubscribeToken, unsubscribeUrl } from "@/lib/unsubscribe";
import { logAudit } from "@/lib/audit";

/**
 * The Notifier seam (F2) — concrete by default (email), ported at the seam. The
 * ONLY caller is the publish chokepoint (reviewReport). Recipient selection goes
 * through authz.listWatchersToNotify so a notification can never reach someone who
 * couldn't open the report; the ReportNotification @@unique row is the durable
 * idempotency guard. Swap getNotifier() for an in-app / push impl later.
 */
export interface Notifier {
  notifyReportPublished(reportId: string): Promise<{ notified: number }>;
}

// Emails default to the primary-audience language (no per-user locale yet).
const EMAIL_LOCALE = "vi";

const emailNotifier: Notifier = {
  async notifyReportPublished(reportId) {
    if (!watchlistEmailsEnabled()) return { notified: 0 };

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        slug: true,
        categoryId: true,
        accessLevel: true,
        audience: true,
        status: true,
        translations: true,
        symbols: { select: { symbolId: true, symbol: { select: { ticker: true } } } },
      },
    });
    if (!report || report.status !== "PUBLISHED") return { notified: 0 };

    const symbolIds = report.symbols.map((s) => s.symbolId);
    if (symbolIds.length === 0) return { notified: 0 };

    const watchers = await listWatchersToNotify(report, symbolIds, "EMAIL");
    if (watchers.length === 0) return { notified: 0 };

    const t = await getTranslations({ locale: EMAIL_LOCALE, namespace: "WatchlistEmail" });
    const { title } = resolveTranslation(report.translations, EMAIL_LOCALE);
    const tickers = report.symbols.map((s) => s.symbol.ticker).join(" · ");
    const reportUrl = `${getAppUrl()}/${EMAIL_LOCALE}/reports/${report.slug}`;

    // Fan out with BOUNDED concurrency instead of strictly serial: W watchers
    // previously cost W × (SMTP RTT + DB RTT) end-to-end. Send in parallel batches,
    // then write the idempotency rows in ONE createMany instead of W inserts.
    const CONCURRENCY = 8;
    const sentIds: string[] = [];
    for (let i = 0; i < watchers.length; i += CONCURRENCY) {
      const batch = watchers.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (w) => {
          const token = w.unsubscribeToken ?? (await getOrCreateUnsubscribeToken(w.id));
          const email = buildWatchlistEmail({
            subject: t("subject", { tickers }),
            heading: t("heading"),
            intro: t("intro", { name: w.name }),
            tickers,
            reportTitle: title,
            buttonLabel: t("button"),
            url: reportUrl,
            unsubscribeNote: t("unsubscribeNote"),
            unsubscribeLabel: t("unsubscribeLabel"),
            unsubscribeUrl: unsubscribeUrl(token, EMAIL_LOCALE),
          });
          await sendMail({ to: w.email, subject: email.subject, html: email.html, text: email.text });
          return w.id;
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled") sentIds.push(r.value);
        else
          console.error(
            `[notifier] send failed for report ${reportId}:`,
            r.reason instanceof Error ? r.reason.message : r.reason,
          );
      }
    }

    // Record sends AFTER they succeed, batched. The @@unique([reportId,userId,
    // channel]) is the durable guard; skipDuplicates makes a concurrent publish /
    // retry a no-op. AT-LEAST-ONCE preserved: if this write throws (e.g. a pool
    // timeout) the users were emailed but no rows are written, so a later republish
    // may email them once more — preferred over silently dropping.
    let notified = 0;
    if (sentIds.length > 0) {
      try {
        const recorded = await prisma.reportNotification.createMany({
          data: sentIds.map((userId) => ({ reportId: report.id, userId, channel: "EMAIL" })),
          skipDuplicates: true,
        });
        notified = recorded.count;
      } catch (err) {
        console.error(
          `[notifier] failed to record ${sentIds.length} sends for report ${reportId}:`,
          err instanceof Error ? err.message : err,
        );
        notified = sentIds.length;
      }
    }

    if (notified > 0) {
      await logAudit({
        action: "REPORT_NOTIFY",
        targetType: "Report",
        targetId: report.id,
        metadata: { channel: "EMAIL", notified },
      });
    }
    return { notified };
  },
};

export function getNotifier(): Notifier {
  return emailNotifier;
}
