"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import {
  Avatar,
  Badge,
  Button,
  ClientTable,
  Dialog,
  EmptyState,
  IconButton,
  Select,
  Toast,
  Tooltip,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/format";
import { ACCOUNT_STATUS } from "@/lib/status";
import {
  approveAccount,
  suspendAccount,
  reinstateAccount,
  setAccountRole,
} from "@/server/accounts";
import type { listAccounts } from "@/server/admin-data";

type Account = Awaited<ReturnType<typeof listAccounts>>[number];

const ROLES: Role[] = ["CLIENT", "EDITOR", "APPROVER", "SUPER_ADMIN"];

export function AccountsTable({
  rows,
  locale,
  canEditRole = false,
  currentUserId,
  actions,
}: {
  rows: Account[];
  locale: string;
  /** SUPER_ADMIN — may change another account's role. */
  canEditRole?: boolean;
  /** The viewer's own id (the role-edit button is hidden on their own row). */
  currentUserId?: string;
  actions?: React.ReactNode;
}) {
  const tNav = useTranslations("Nav");
  const tRoles = useTranslations("Roles");
  const tStatus = useTranslations("Status");
  const tAdmin = useTranslations("Admin");

  const columns: Column<Account>[] = React.useMemo(
    () => [
    {
      header: tAdmin("colUser"),
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-[11px]">
          <Avatar name={u.name} size={32} />
          <div className="min-w-0">
            <div className="truncate text-regular font-medium text-ink">
              {u.name}
            </div>
            <div className="truncate font-mono text-micro text-ink-3">
              {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: tAdmin("colOrganization"),
      cell: (u) => (
        <span className="truncate text-small text-ink-2">
          {u.organization ?? "—"}
        </span>
      ),
    },
    {
      header: tAdmin("colRole"),
      cell: (u) => (
        <Badge tone={u.role === "SUPER_ADMIN" ? "accent" : "neutral"} size="sm">
          {tRoles(u.role)}
        </Badge>
      ),
    },
    {
      header: tAdmin("colStatus"),
      cell: (u) => (
        <Badge tone={ACCOUNT_STATUS[u.status].tone} dot size="sm">
          {tStatus(ACCOUNT_STATUS[u.status].key)}
        </Badge>
      ),
    },
    {
      header: tAdmin("colGroup"),
      cell: (u) => (
        <span className="truncate text-small text-ink-3">
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
          className="font-mono text-mini tabular-nums text-ink-3"
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
          account={u}
          canEditRole={canEditRole && u.id !== currentUserId}
        />
      ),
    },
    ],
    [tRoles, tStatus, tAdmin, locale, canEditRole, currentUserId],
  );

  const statusOptions = React.useMemo(
    () =>
      (["INVITED", "UNVERIFIED", "PENDING", "APPROVED", "SUSPENDED"] as const).map((s) => ({
        value: s,
        label: tStatus(ACCOUNT_STATUS[s].key),
      })),
    [tStatus],
  );

  const getRowKey = React.useCallback((u: Account) => u.id, []);
  const searchText = React.useCallback(
    (u: Account) =>
      `${u.name} ${u.email} ${u.organization ?? ""} ${u.groups.join(" ")}`,
    [],
  );
  const filterGet = React.useCallback((u: Account) => u.status, []);
  const filter = React.useMemo(
    () => ({ get: filterGet, options: statusOptions }),
    [filterGet, statusOptions],
  );

  return (
    <ClientTable<Account>
      rows={rows}
      getRowKey={getRowKey}
      columns={columns}
      searchText={searchText}
      filter={filter}
      minWidth={900}
      pageSize={8}
      title={
        <h2 className="text-medium font-semibold tracking-tight">
          {tNav("accounts")}
        </h2>
      }
      actions={actions}
      empty={<EmptyState icon="user-plus" title={tAdmin("emptyAccounts")} />}
    />
  );
}

/**
 * Per-row account actions — same pending+toast+confirm pattern as the reports
 * table. Status transition (approve / suspend / reinstate; suspend & role change
 * are confirmed) PLUS, for SUPER_ADMIN, a role-edit dialog. Safe transitions fire
 * instantly; the revoking one (suspend) and the role change go through a Dialog.
 */
function AccountAction({
  account,
  canEditRole,
}: {
  account: Account;
  canEditRole?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("Actions");
  const tAdmin = useTranslations("Admin");
  const tRoles = useTranslations("Roles");
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [roleVal, setRoleVal] = React.useState<Role>(account.role);
  const [toast, setToast] = React.useState<{
    tone: "success" | "danger";
    msg: string;
  } | null>(null);

  const run = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) {
        setToast({ tone: "success", msg: successMsg });
        router.refresh();
      } else {
        setToast({ tone: "danger", msg: res.error ?? tAdmin("actionError") });
      }
    } catch {
      setToast({ tone: "danger", msg: tAdmin("actionError") });
    } finally {
      setBusy(false);
      setConfirm(false);
      setRoleOpen(false);
    }
  };

  let statusBtn: React.ReactNode = null;
  if (account.status === "PENDING") {
    statusBtn = (
      <Button
        size="sm"
        variant="primary"
        loading={busy}
        onClick={() => run(() => approveAccount(account.id), tAdmin("toastApproved"))}
      >
        {t("approve")}
      </Button>
    );
  } else if (account.status === "APPROVED") {
    statusBtn = (
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirm(true)}>
        {tAdmin("suspendAccount")}
      </Button>
    );
  } else {
    statusBtn = (
      <Button
        size="sm"
        variant="secondary"
        loading={busy}
        onClick={() => run(() => reinstateAccount(account.id), tAdmin("toastReinstated"))}
      >
        {tAdmin("reinstateAccount")}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {statusBtn}
      {canEditRole && (
        <Tooltip content={tAdmin("editRole")} side="left">
          <IconButton
            size="sm"
            label={tAdmin("editRole")}
            disabled={busy}
            onClick={() => {
              setRoleVal(account.role);
              setRoleOpen(true);
            }}
          >
            <Icon name="user-cog" size={16} />
          </IconButton>
        </Tooltip>
      )}

      <Dialog
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={tAdmin("suspendConfirmTitle")}
        description={tAdmin("suspendConfirmBody", {
          name: account.name,
          email: account.email,
        })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => run(() => suspendAccount(account.id), tAdmin("toastSuspended"))}
            >
              {tAdmin("suspendAccount")}
            </Button>
          </>
        }
      />

      <Dialog
        open={roleOpen}
        onClose={() => !busy && setRoleOpen(false)}
        title={tAdmin("editRoleTitle")}
        description={tAdmin("editRoleBody", { name: account.name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoleOpen(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={roleVal === account.role}
              onClick={() =>
                run(
                  () => setAccountRole({ userId: account.id, role: roleVal }),
                  tAdmin("toastRoleChanged"),
                )
              }
            >
              {t("save")}
            </Button>
          </>
        }
      >
        <Select
          label={tAdmin("colRole")}
          value={roleVal}
          onChange={(e) => setRoleVal(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {tRoles(r)}
            </option>
          ))}
        </Select>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone={toast.tone}
            icon={
              <Icon
                name={toast.tone === "success" ? "check-circle" : "alert-circle"}
                size={18}
              />
            }
            message={toast.msg}
            onClose={() => setToast(null)}
            duration={3500}
          />
        </div>
      )}
    </div>
  );
}
