import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AuditAction } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Avatar, DataTable, EmptyState } from "@/components/ui";
import { adminNav } from "@/lib/nav";
import { formatDateTime } from "@/lib/format";
import { listAuditLog } from "@/server/admin-data";

type AuditEvent = Awaited<ReturnType<typeof listAuditLog>>[number];

type AdminT = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

/** Audit action codes → localized labels (no shared message keys exist for these). */
const actionLabels = (t: AdminT): Record<AuditAction, string> => ({
  ACCOUNT_APPROVE: t("auditActionAccountApprove"),
  ACCOUNT_REJECT: t("auditActionAccountReject"),
  ACCOUNT_SUSPEND: t("auditActionAccountSuspend"),
  ACCOUNT_REINSTATE: t("auditActionAccountReinstate"),
  ACCOUNT_LOCKED: t("auditActionAccountLocked"),
  ENTITLEMENT_GRANT: t("auditActionEntitlementGrant"),
  ENTITLEMENT_REVOKE: t("auditActionEntitlementRevoke"),
  REPORT_UPLOAD: t("auditActionReportUpload"),
  REPORT_SUBMIT: t("auditActionReportSubmit"),
  REPORT_APPROVE: t("auditActionReportApprove"),
  REPORT_REJECT: t("auditActionReportReject"),
  REPORT_PUBLISH: t("auditActionReportPublish"),
  REPORT_ARCHIVE: t("auditActionReportArchive"),
  GROUP_CREATE: t("auditActionGroupCreate"),
  GROUP_MEMBER_ADD: t("auditActionGroupMemberAdd"),
  GROUP_MEMBER_REMOVE: t("auditActionGroupMemberRemove"),
});

/** Target-type codes → short localized nouns. */
const targetLabels = (t: AdminT): Record<string, string> => ({
  User: t("auditTargetUser"),
  Report: t("auditTargetReport"),
  Group: t("auditTargetGroup"),
  Entitlement: t("auditTargetEntitlement"),
  GroupMembership: t("auditTargetGroupMembership"),
});

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const [tNav, tRoles, tAdmin] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
    getTranslations("Admin"),
  ]);
  const events = await listAuditLog(80);

  const ACTION_LABEL = actionLabels(tAdmin);
  const TARGET_LABEL = targetLabels(tAdmin);

  return (
    <AppShell
      nav={adminNav((k) => tNav(k))}
      activeKey="audit"
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tNav("audit")}
    >
      <div className="mx-auto max-w-[1180px] px-7 py-7">
        <div className="overflow-hidden rounded-card border border-line bg-surface-1">
          <div className="flex items-center gap-3 px-[18px] py-4">
            <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
              {tAdmin("auditCardTitle")}
            </h2>
            <span
              data-numeric
              className="font-mono text-[12px] tabular-nums text-ink-3"
            >
              {events.length}
            </span>
          </div>

          <DataTable<AuditEvent>
            minWidth={820}
            caption={tAdmin("auditCardTitle")}
            rows={events}
            getRowKey={(e) => e.id}
            columns={[
              {
                header: tAdmin("colTimestamp"),
                cellClassName:
                  "whitespace-nowrap font-mono text-[12px] tabular-nums text-ink-2",
                cell: (e) => (
                  <span data-numeric>{formatDateTime(e.createdAt, locale)}</span>
                ),
              },
              {
                header: tAdmin("colActor"),
                cell: (e) => (
                  <span className="flex items-center gap-[9px] text-[13px] text-ink-2">
                    <Avatar name={e.actor} size={22} />
                    {e.actor}
                  </span>
                ),
              },
              {
                header: tAdmin("colAuditAction"),
                cellClassName: "text-[13px] text-ink",
                cell: (e) => ACTION_LABEL[e.action] ?? e.action,
              },
              {
                header: tAdmin("colTarget"),
                cell: (e) => (
                  <>
                    <span className="text-[13px] text-ink-2">
                      {TARGET_LABEL[e.targetType] ?? e.targetType}
                    </span>
                    {e.targetId && (
                      <span
                        data-numeric
                        className="ml-2 font-mono text-[11px] text-ink-4"
                      >
                        {e.targetId}
                      </span>
                    )}
                  </>
                ),
              },
            ]}
            empty={
              <EmptyState
                icon="file-stack"
                title={tAdmin("emptyAudit")}
              />
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
