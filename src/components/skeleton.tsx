import { cn } from "@/lib/utils";

/** A single pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-control bg-surface-2", className)}
    />
  );
}

/**
 * Shell-shaped loading state for the Portal/Admin areas. Mirrors the AppShell
 * (sidebar + topbar + content) so navigation feels continuous — the sidebar
 * silhouette stays put while the page streams in.
 */
export function AppShellSkeleton() {
  return (
    <div className="grid h-screen grid-cols-[240px_1fr] bg-surface">
      {/* Sidebar */}
      <aside className="flex flex-col gap-2 border-r border-line bg-surface-1 px-3 py-[14px]">
        <div className="mb-3 flex items-center gap-[9px] px-1.5 py-1">
          <Skeleton className="h-7 w-7 rounded-[7px]" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-[6px]" />
        ))}
        <div className="mt-auto flex items-center gap-[10px] border-t border-line px-1.5 py-2.5">
          <Skeleton className="h-[30px] w-[30px] rounded-pill" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col overflow-hidden">
        <header className="flex h-16 flex-none items-center justify-between border-b border-line px-7">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-16" />
        </header>
        <div className="mx-auto w-full max-w-[1180px] px-7 py-7">
          <div className="mb-6 grid grid-cols-4 gap-[14px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-card" />
            ))}
          </div>
          <Skeleton className="mb-3 h-7 w-56" />
          <div className="overflow-hidden rounded-card border border-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-line px-[18px] py-3 last:border-b-0"
              >
                <Skeleton className="h-9 w-[30px] rounded-card" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-24 rounded-badge" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
