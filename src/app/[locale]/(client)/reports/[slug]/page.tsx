import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { getReportBySlug } from "@/server/reports";
import { getWatchedSymbolIds } from "@/server/watchlist";
import { listReportAttachments } from "@/server/attachments";
import { isStaff } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { PdfViewer } from "./pdf-viewer";

/**
 * THE PDF VIEWER & approval — core surface (blueprint §VISUAL / §6.1).
 *
 * RSC: resolves the report via the entitlement-aware data layer and hands a
 * plain, serializable object to the client viewer island. The workflow timeline
 * is shown to all staff (`canViewWorkflow`), but the lifecycle ACTION buttons
 * (submit/approve/reject/publish) are gated to APPROVER/SUPER_ADMIN (`canReview`)
 * — the same gate `reviewReport` enforces, so EDITOR never sees a button the
 * server would reject.
 */
// Gated, per-user (entitlement-aware) — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function ReportViewerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  // (client) layout already guards, but never trust the middleware.
  if (!session?.user) notFound();
  const user = session.user;

  // Watched-symbol ids depend only on user.id (never on the report), so start
  // that read concurrently with the report fetch — it overlaps the round-trip
  // instead of adding a serial one. Staff have no watchlist → skip the query.
  const watchedIdsPromise = isStaff(user.role)
    ? Promise.resolve<string[]>([])
    : getWatchedSymbolIds(user.id);

  const report = await getReportBySlug(slug, locale, {
    id: user.id,
    role: user.role,
  });
  if (!report) notFound();

  // Staff see the approval workflow timeline; only APPROVER/SUPER_ADMIN get the
  // lifecycle action buttons (mirrors reviewReport's report.review gate).
  const canViewWorkflow = isStaff(user.role);
  const canReview = can(user.role, "report.review");

  // Back target = where this role manages reports, so staff return to the admin
  // table (their "route quản trị") instead of being dropped on the client library.
  const backHref = isStaff(user.role) ? "/admin/reports" : "/reports";

  // report.id is now known → attachments can resolve. Await it together with the
  // already-in-flight watched ids (F3 read applies the per-file audience gate:
  // INTERNAL → staff only; all staff may manage via report.upload).
  const [watchedIds, attachmentRows] = await Promise.all([
    watchedIdsPromise,
    listReportAttachments(report.id, user.role),
  ]);
  const watched = new Set(watchedIds);
  const watchTickers = isStaff(user.role)
    ? []
    : report.symbols.map((s) => ({ id: s.id, ticker: s.ticker, watching: watched.has(s.id) }));
  const attachments = attachmentRows.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));
  const canManageAttachments = isStaff(user.role);

  // Plain, serializable props for the client island.
  const viewerReport = {
    id: report.id,
    slug: report.slug,
    title: report.title,
    summary: report.summary,
    status: report.status,
    accessLevel: report.accessLevel,
    categoryLabel: report.categoryLabel,
    coverLabel: report.coverLabel,
    author: report.author ?? report.uploadedBy,
    publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
    pageCount: report.pageCount,
    hasFile: report.hasFile,
  };

  return (
    <PdfViewer
      report={viewerReport}
      locale={locale}
      canViewWorkflow={canViewWorkflow}
      canReview={canReview}
      watchTickers={watchTickers}
      attachments={attachments}
      canManageAttachments={canManageAttachments}
      backHref={backHref}
      viewUrl={`/api/reports/${report.id}/view`}
      reviewerName={user.name ?? "Người duyệt"}
    />
  );
}
