import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { adminNav } from "@/lib/nav";
import { listAccounts } from "@/server/admin-data";
import { AccountsTable } from "./accounts-table";

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

  const [t, tNav, tRoles] = await Promise.all([
    getTranslations("Actions"),
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
          actions={
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Icon name="user-plus" size={15} />}
            >
              {t("invite")}
            </Button>
          }
        />
      </div>
    </AppShell>
  );
}
