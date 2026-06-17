import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getReportBySlug } from "@/server/reports";
import { isStaff } from "@/lib/rbac";
import { PdfViewer } from "./pdf-viewer";

/**
 * THE PDF VIEWER & approval — core surface (blueprint §VISUAL / §6.1).
 *
 * RSC: resolves the report via the entitlement-aware data layer and hands a
 * plain, serializable object to the client viewer island. Approval affordances
 * are gated by `canApprove` (staff only) computed on the server.
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

  const session = await auth();
  // (client) layout already guards, but never trust the middleware.
  if (!session?.user) notFound();
  const user = session.user;

  const report = await getReportBySlug(slug, locale, {
    id: user.id,
    role: user.role,
  });
  if (!report) notFound();

  const canApprove = isStaff(user.role);

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
      canApprove={canApprove}
      viewUrl={`/api/reports/${report.id}/view`}
      reviewerName={user.name ?? "Người duyệt"}
    />
  );
}
