"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";

/**
 * Client providers. React Query is used ONLY for genuine client islands
 * (interactive admin tables, polling) — never as the default fetch layer
 * (blueprint §2). Most data arrives via RSC.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
