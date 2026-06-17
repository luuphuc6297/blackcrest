import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/icon";
import { adminNav } from "@/lib/nav";
import { listGroupsWithEntitlements } from "@/server/admin-data";
import { listCategories, listAdminReports, categoryName } from "@/server/reports";
import { grantEntitlement, revokeEntitlement } from "@/server/entitlements";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminEntitlementsPage({
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

  const [groups, categories, reports] = await Promise.all([
    listGroupsWithEntitlements(locale),
    listCategories(),
    listAdminReports(locale),
  ]);

  return (
    <AppShell
      nav={adminNav((k) => tNav(k))}
      activeKey="entitlements"
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tNav("entitlements")}
      actions={
        <Badge tone="accent" dot>
          {tRoles(user.role)}
        </Badge>
      }
    >
      <div className="mx-auto max-w-[1180px] p-7">
        <div className="mb-6">
          <p className="max-w-[640px] text-[13px] leading-relaxed text-ink-3">
            {tAdmin("entitlementsIntro")}
          </p>
        </div>

        {groups.length === 0 ? (
          <Card padding={0}>
            <EmptyState
              icon="shield-check"
              title={tAdmin("emptyGroupsTitle")}
              description={tAdmin("emptyGroupsDescription")}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-[14px]">
            {groups.map((g) => (
              <Card key={g.id} padding={0}>
                {/* Group header */}
                <div className="flex items-center gap-[10px] border-b border-line px-[18px] py-4">
                  <Icon
                    name="shield-check"
                    size={17}
                    className="text-ink-3"
                  />
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold tracking-[-0.012em]">
                      {g.name}
                    </div>
                    <div className="font-mono text-[11px] text-ink-3">
                      {g.slug}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-[12px] text-ink-3">
                    <Icon name="user-plus" size={14} className="text-ink-4" />
                    <span data-numeric className="font-mono tabular-nums">
                      {g.memberCount}
                    </span>
                    <span>{tAdmin("members")}</span>
                  </div>
                </div>

                {/* Current entitlements */}
                <div className="px-[18px] py-4">
                  <div className="mb-[10px] text-[10px] font-medium uppercase tracking-[0.06em] text-ink-4">
                    {tAdmin("currentEntitlements")}
                  </div>
                  {g.entitlements.length === 0 ? (
                    <EmptyState
                      icon="folder-open"
                      title={tAdmin("emptyEntitlementsTitle")}
                      description={tAdmin("emptyEntitlementsDescription")}
                      className="px-0 py-8"
                    />
                  ) : (
                    <ul className="flex flex-col gap-[1px]">
                      {g.entitlements.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 border-t border-line py-[9px] first:border-t-0"
                        >
                          <Badge tone="neutral">
                            {e.kind === "category"
                              ? tAdmin("kindCategory")
                              : tAdmin("kindReport")}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                            {e.label}
                          </span>
                          <form action={revokeEntitlement}>
                            <input
                              type="hidden"
                              name="entitlementId"
                              value={e.id}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:bg-danger-tint"
                              leadingIcon={<Icon name="trash-2" size={14} />}
                            >
                              {tAdmin("revoke")}
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Grant forms — two separate forms, each sends exactly one target. */}
                <div className="grid grid-cols-1 gap-[14px] border-t border-line bg-surface-1 px-[18px] py-4 md:grid-cols-2">
                  {/* Grant by category */}
                  <form
                    action={grantEntitlement}
                    className="flex flex-col gap-[10px]"
                  >
                    <input type="hidden" name="groupId" value={g.id} />
                    <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-ink-4">
                      {tAdmin("grantByCategory")}
                    </div>
                    <Select name="categoryId" defaultValue="" required>
                      <option value="" disabled>
                        {tAdmin("selectCategory")}
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {categoryName(c, locale)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      leadingIcon={<Icon name="shield-check" size={14} />}
                    >
                      {tAdmin("grantCategory")}
                    </Button>
                  </form>

                  {/* Grant by report */}
                  <form
                    action={grantEntitlement}
                    className="flex flex-col gap-[10px]"
                  >
                    <input type="hidden" name="groupId" value={g.id} />
                    <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-ink-4">
                      {tAdmin("grantByReport")}
                    </div>
                    <Select name="reportId" defaultValue="" required>
                      <option value="" disabled>
                        {tAdmin("selectReport")}
                      </option>
                      {reports.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      leadingIcon={<Icon name="file-text" size={14} />}
                    >
                      {tAdmin("grantReport")}
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
