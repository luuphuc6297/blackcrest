import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { isStaff } from "@/lib/rbac";

// Auth-gated + staff-only data → always render per request.
export const dynamic = "force-dynamic";

/**
 * Admin area guard — requires a staff role (blueprint §F3). Re-checked here at
 * the data layer; middleware redirect is convenience only.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const user = session?.user;
  if (!user) {
    redirect({ href: "/login", locale });
  } else if (!isStaff(user.role)) {
    redirect({ href: "/portal", locale });
  }
  return <>{children}</>;
}
