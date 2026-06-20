import { setRequestLocale } from "next-intl/server";
import { findUserByUnsubscribeToken } from "@/lib/unsubscribe";
import { UnsubscribeConfirm } from "./unsubscribe-confirm";

// Token-authorized, public. Never prerender/cache. The actual opt-out is a POST
// (the confirm button) — a bare GET only reads, so email link-scanners that
// prefetch the URL can't unsubscribe anyone.
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;

  const user = token ? await findUserByUnsubscribeToken(token) : null;

  return (
    <UnsubscribeConfirm
      token={token ?? ""}
      email={user?.email ?? ""}
      valid={!!user}
      alreadyOff={user ? !user.watchlistEmails : false}
    />
  );
}
