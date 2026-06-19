"use client";

/**
 * Client providers wrapper. Currently a pass-through: data arrives via RSC,
 * so no client-side data-fetching provider is needed. Kept as the single
 * place to add future client-only providers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
