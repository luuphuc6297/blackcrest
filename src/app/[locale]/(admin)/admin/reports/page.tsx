import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { can } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { adminNav } from "@/lib/nav";
import { listAdminReports, listCategories, categoryName } from "@/server/reports";
import { UploadReportDialog } from "./upload-dialog";
import { ReportsTable } from "./reports-table";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  const user = session!.user;

  // Row-action permissions, derived from the central PERMISSIONS map so the UI
  // and the server gates can never drift (the actions re-check the same caps).
  const perms = {
    advance: can(user.role, "report.review"),
    access: can(user.role, "report.setAccess"),
    tag: can(user.role, "report.tag"),
    del: can(user.role, "report.delete"),
  };

  const [tNav, tRoles] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
  ]);

  const [reports, categories] = await Promise.all([
    listAdminReports(locale),
    listCategories(),
  ]);
  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: categoryName(c, locale),
  }));

  return (
    <AppShell
      nav={adminNav((k) => tNav(k))}
      activeKey="reports"
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tNav("reports")}
      actions={<UploadReportDialog categories={categoryOptions} />}
    >
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
        <ReportsTable rows={reports} locale={locale} perms={perms} />
      </div>
    </AppShell>
  );
}
