"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { UserStatus } from "@prisma/client";
import {
  Avatar,
  Badge,
  Button,
  ClientTable,
  EmptyState,
  type Column,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { ACCOUNT_STATUS } from "@/lib/status";
import {
  approveAccount,
  suspendAccount,
  reinstateAccount,
} from "@/server/accounts";
import type { listAccounts } from "@/server/admin-data";

type Account = Awaited<ReturnType<typeof listAccounts>>[number];

export function AccountsTable({
  rows,
  locale,
  actions,
}: {
  rows: Account[];
  locale: string;
  actions?: React.ReactNode;
}) {
  const t = useTranslations("Actions");
  const tNav = useTranslations("Nav");
  const tRoles = useTranslations("Roles");
  const tStatus = useTranslations("Status");
  const tAdmin = useTranslations("Admin");

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

  const statusOptions = (["PENDING", "APPROVED", "SUSPENDED"] as const).map(
    (s) => ({ value: s, label: tStatus(ACCOUNT_STATUS[s].key) }),
  );

  return (
    <ClientTable<Account>
      rows={rows}
      getRowKey={(u) => u.id}
      columns={columns}
      searchText={(u) =>
        `${u.name} ${u.email} ${u.organization ?? ""} ${u.groups.join(" ")}`
      }
      filter={{ get: (u) => u.status, options: statusOptions }}
      minWidth={900}
      pageSize={8}
      title={
        <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
          {tNav("accounts")}
        </h2>
      }
      actions={actions}
      empty={<EmptyState icon="user-plus" title={tAdmin("emptyAccounts")} />}
    />
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
