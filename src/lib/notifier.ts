import "server-only";
import { getTranslations } from "next-intl/server";
import { Prisma } from "@prisma/client";
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

    let notified = 0;
    for (const w of watchers) {
      try {
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
        // Record the send AFTER it succeeds — a failed send leaves no row, so a
        // future republish naturally retries it; the @@unique([reportId,userId,
        // channel]) prevents any double-record. Contract is AT-LEAST-ONCE: if the
        // send succeeds but this create() throws a non-P2002 error (e.g. a pool
        // timeout), the user was emailed but no row is written, so a later
        // republish may email them once more — preferred over silently dropping.
        await prisma.reportNotification.create({
          data: { reportId: report.id, userId: w.id, channel: "EMAIL" },
        });
        notified++;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          continue; // already recorded by a concurrent publish — fine
        }
        console.error(
          `[notifier] failed to notify ${w.id} for report ${reportId}:`,
          err instanceof Error ? err.message : err,
        );
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
