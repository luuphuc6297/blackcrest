import { getTranslations, setRequestLocale } from "next-intl/server";
import type { UserStatus } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  StatCard,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { adminNav } from "@/lib/nav";
import { formatDate } from "@/lib/format";
import { ACCOUNT_STATUS } from "@/lib/status";
import { listAccounts } from "@/server/admin-data";
import {
  approveAccount,
  suspendAccount,
  reinstateAccount,
} from "@/server/accounts";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const [t, tNav, tRoles, tStatus, tAdmin] = await Promise.all([
    getTranslations("Actions"),
    getTranslations("Nav"),
    getTranslations("Roles"),
    getTranslations("Status"),
    getTranslations("Admin"),
  ]);

  const accounts = await listAccounts();

  const total = accounts.length;
  const active = accounts.filter((a) => a.status === "APPROVED").length;
  const pending = accounts.filter((a) => a.status === "PENDING").length;
  const admins = accounts.filter((a) => a.role === "SUPER_ADMIN").length;

  type Account = (typeof accounts)[number];

  const columns: Column<Account>[] = [
    {
      header: tAdmin("colUser"),
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-[11px]">
          <Avatar name={u.name} size={32} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium text-ink">
              {u.name}
            </div>
            <div className="truncate font-mono text-[11px] text-ink-3">
              {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: tAdmin("colOrganization"),
      cell: (u) => (
        <span className="truncate text-[13px] text-ink-2">
          {u.organization ?? "—"}
        </span>
      ),
    },
    {
      header: tAdmin("colRole"),
      cell: (u) => (
        <Badge tone={u.role === "SUPER_ADMIN" ? "accent" : "neutral"}>
          {tRoles(u.role)}
        </Badge>
      ),
    },
    {
      header: tAdmin("colStatus"),
      cell: (u) => (
        <Badge tone={ACCOUNT_STATUS[u.status].tone} dot>
          {tStatus(ACCOUNT_STATUS[u.status].key)}
        </Badge>
      ),
    },
    {
      header: tAdmin("colGroup"),
      cell: (u) => (
        <span className="truncate text-[13px] text-ink-3">
          {u.groups.length > 0 ? u.groups.join(", ") : "—"}
        </span>
      ),
    },
    {
      header: tAdmin("colCreatedAt"),
      align: "right",
      cell: (u) => (
        <span
          data-numeric
          className="font-mono text-[12px] tabular-nums text-ink-3"
        >
          {formatDate(u.createdAt, locale)}
        </span>
      ),
    },
    {
      header: tAdmin("colAction"),
      srHeader: true,
      align: "right",
      cell: (u) => (
        <AccountAction
          status={u.status}
          userId={u.id}
          labels={{
            approve: t("approve"),
            suspend: tAdmin("suspendAccount"),
            reinstate: tAdmin("reinstateAccount"),
          }}
        />
      ),
    },
  ];

  return (
    <AppShell
      nav={adminNav((k) => tNav(k))}
      activeKey="accounts"
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tNav("accounts")}
      actions={
        <Badge tone="accent" dot>
          {tRoles(user.role)}
        </Badge>
      }
    >
      <div className="mx-auto max-w-[1180px] p-7">
        {/* Stat strip */}
        <div className="mb-6 grid grid-cols-2 gap-[14px] lg:grid-cols-4">
          <StatCard label={tAdmin("totalAccounts")} value={total} dot="neutral" />
          <StatCard label={tAdmin("activeAccounts")} value={active} dot="approved" />
          <StatCard label={tAdmin("pendingActivation")} value={pending} dot="review" />
          <StatCard label={tAdmin("adminCount")} value={admins} dot="accent" />
        </div>

        {/* Accounts table */}
        <Card padding={0}>
          <div className="flex items-center gap-3 px-[18px] py-4">
            <h2 className="text-[18px] font-semibold tracking-[-0.012em]">
              {tNav("accounts")}
            </h2>
            <div className="ml-auto">
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="user-plus" size={15} />}
              >
                {t("invite")}
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={accounts}
            getRowKey={(u) => u.id}
            minWidth={900}
            caption={tNav("accounts")}
            empty={<EmptyState icon="user-plus" title={tAdmin("emptyAccounts")} />}
          />
        </Card>
      </div>
    </AppShell>
  );
}

/** One status-transition form per row, keyed on the user's current status. */
function AccountAction({
  status,
  userId,
  labels,
}: {
  status: UserStatus;
  userId: string;
  labels: { approve: string; suspend: string; reinstate: string };
}) {
  if (status === "PENDING") {
    return (
      <form action={approveAccount}>
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" variant="primary">
          {labels.approve}
        </Button>
      </form>
    );
  }
  if (status === "APPROVED") {
    return (
      <form action={suspendAccount}>
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" variant="ghost">
          {labels.suspend}
        </Button>
      </form>
    );
  }
  return (
    <form action={reinstateAccount}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="sm" variant="secondary">
        {labels.reinstate}
      </Button>
    </form>
  );
}
