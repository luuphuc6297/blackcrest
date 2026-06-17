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
 * Shell-shaped loading state for the Portal/Admin areas. Mirrors the responsive
 * AppShell: below `md` the sidebar is hidden (AppShell uses an off-canvas drawer
 * + hamburger there) and content stacks; at `md+` the sidebar silhouette + grid
 * appear. Keeps navigation feeling continuous while the page streams in.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-surface md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar — desktop only (mobile shows the drawer/hamburger in AppShell) */}
      <aside className="hidden flex-col gap-2 border-r border-line bg-surface-1 px-3 py-[14px] md:flex">
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
      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 flex-none items-center gap-3 border-b border-line px-4 md:px-7">
          {/* Hamburger placeholder — mobile only */}
          <Skeleton className="h-9 w-9 rounded-control md:hidden" />
          <Skeleton className="h-5 w-32 sm:w-40" />
          <Skeleton className="ml-auto h-9 w-16" />
        </header>
        <div className="mx-auto w-full max-w-[1180px] px-4 py-5 md:px-7 md:py-7">
          <div className="mb-6 grid grid-cols-2 gap-[14px] lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-card" />
            ))}
          </div>
          <Skeleton className="mb-3 h-7 w-48 sm:w-56" />
          <div className="overflow-hidden rounded-card border border-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-line px-[14px] py-3 last:border-b-0 md:px-[18px]"
              >
                <Skeleton className="h-9 w-[30px] flex-none rounded-card" />
                <Skeleton className="h-4 flex-1" />
                {/* Trailing columns collapse on narrow screens, like the table */}
                <Skeleton className="hidden h-5 w-24 rounded-badge sm:block" />
                <Skeleton className="hidden h-4 w-20 sm:block" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
