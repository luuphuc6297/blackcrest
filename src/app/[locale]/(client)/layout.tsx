import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";

// Auth-gated + per-user data → always render per request (never prerender/cache).
export const dynamic = "force-dynamic";

/**
 * Investor area guard (defense in depth — middleware also redirects, but never
 * trust it; blueprint §6.1). Pages compose <AppShell> themselves.
 */
export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect({ href: "/login", locale });
  return <>{children}</>;
}
