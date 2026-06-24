import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock every collaborator so the test exercises the notifier's ORCHESTRATION
// (gate → fan-out → send → record → audit) without a DB or real mail.
vi.mock("@/lib/flags", () => ({ watchlistEmailsEnabled: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  listWatchersToNotify: vi.fn(),
  resolveTranslation: vi.fn(() => ({ title: "Báo cáo MWG", summary: null, author: null })),
}));
vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(),
  buildWatchlistEmail: vi.fn(() => ({ subject: "s", html: "h", text: "t" })),
  getAppUrl: () => "http://localhost:3000",
}));
vi.mock("@/lib/unsubscribe", () => ({
  getOrCreateUnsubscribeToken: vi.fn(async () => "tok"),
  unsubscribeUrl: () => "http://localhost:3000/vi/unsubscribe?token=tok",
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (k: string) => k),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: { findUnique: vi.fn() },
    reportNotification: { createMany: vi.fn() },
  },
}));

import { getNotifier } from "@/lib/notifier";
import { watchlistEmailsEnabled } from "@/lib/flags";
import { listWatchersToNotify } from "@/lib/authz";
import { sendMail } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const REPORT = {
  id: "r1",
  slug: "mwg-x",
  categoryId: "c1",
  accessLevel: "PUBLIC",
  status: "PUBLISHED",
  translations: [],
  symbols: [{ symbolId: "s1", symbol: { ticker: "MWG" } }],
};
const WATCHER = { id: "u1", email: "a@b.vn", name: "A", unsubscribeToken: "tok" };

describe("notifier — notifyReportPublished", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no-ops when the feature flag is off", async () => {
    vi.mocked(watchlistEmailsEnabled).mockReturnValue(false);
    const res = await getNotifier().notifyReportPublished("r1");
    expect(res).toEqual({ notified: 0 });
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("records a notification + audits on a successful send", async () => {
    vi.mocked(watchlistEmailsEnabled).mockReturnValue(true);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(REPORT as never);
    vi.mocked(listWatchersToNotify).mockResolvedValue([WATCHER]);
    vi.mocked(sendMail).mockResolvedValue({ delivered: false }); // console fallback
    vi.mocked(prisma.reportNotification.createMany).mockResolvedValue({ count: 1 });

    const res = await getNotifier().notifyReportPublished("r1");

    expect(res).toEqual({ notified: 1 });
    expect(sendMail).toHaveBeenCalledOnce();
    // Sends are recorded in ONE batched createMany (skipDuplicates is the guard).
    expect(prisma.reportNotification.createMany).toHaveBeenCalledWith({
      data: [{ reportId: "r1", userId: "u1", channel: "EMAIL" }],
      skipDuplicates: true,
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REPORT_NOTIFY", targetId: "r1" }),
    );
  });

  it("does NOT record (or audit) when the send fails — no spurious row", async () => {
    vi.mocked(watchlistEmailsEnabled).mockReturnValue(true);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(REPORT as never);
    vi.mocked(listWatchersToNotify).mockResolvedValue([WATCHER]);
    vi.mocked(sendMail).mockRejectedValue(new Error("SendGrid 401"));

    const res = await getNotifier().notifyReportPublished("r1");

    expect(res).toEqual({ notified: 0 });
    expect(prisma.reportNotification.createMany).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("skips a report with no symbols", async () => {
    vi.mocked(watchlistEmailsEnabled).mockReturnValue(true);
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ ...REPORT, symbols: [] } as never);
    const res = await getNotifier().notifyReportPublished("r1");
    expect(res).toEqual({ notified: 0 });
    expect(listWatchersToNotify).not.toHaveBeenCalled();
  });
});
