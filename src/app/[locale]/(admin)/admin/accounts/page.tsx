import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { can } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui";
import { adminNav } from "@/lib/nav";
import { listAccounts } from "@/server/admin-data";
import { AccountsTable } from "./accounts-table";
import { InviteMemberDialog } from "./invite-dialog";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  const user = session!.user;

  const [tNav, tRoles] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
  ]);

  const accounts = await listAccounts();

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
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
        <AccountsTable
          rows={accounts}
          locale={locale}
          canEditRole={can(user.role, "account.setRole")}
          currentUserId={user.id}
          actions={
            can(user.role, "account.invite") ? (
              <InviteMemberDialog locale={locale} />
            ) : null
          }
        />
      </div>
    </AppShell>
  );
}
