import type { ReactNode } from "react";
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
 * Card-grid skeleton for the document library (facet rail + result cards). Shown
 * via reports/loading.tsx the instant the route is entered AND inline while a
 * filter transition is in flight, so a click always has immediate feedback.
 */
export function LibraryGridSkeleton({ cards = 9 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10" aria-hidden>
      {/* facet rail */}
      <aside className="flex-none lg:w-[230px]">
        <Skeleton className="h-[34px] w-full rounded-control" />
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="mt-5 flex flex-col gap-[6px]">
            <Skeleton className="mb-1 h-3 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[30px] w-full rounded-control" />
            ))}
          </div>
        ))}
      </aside>
      {/* results */}
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <Skeleton className="h-7 w-24 rounded-control" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-[148px] rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Shell-shaped loading state for the Portal/Admin areas. Mirrors the responsive
 * AppShell: below `md` the sidebar is hidden (AppShell uses an off-canvas drawer
 * + hamburger there) and content stacks; at `md+` the sidebar silhouette + grid
 * appear. Keeps navigation feeling continuous while the page streams in.
 */
export function AppShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface sm:grid sm:grid-cols-[240px_1fr]">
      {/* Sidebar — shown from sm+ (mirrors AppShell); below that the drawer/hamburger */}
      <aside className="hidden flex-col gap-2 border-r border-line bg-surface-1 px-3 py-[14px] sm:flex">
        <div className="mb-3 flex items-center gap-[9px] px-1.5 py-1">
          <Skeleton className="h-7 w-7 rounded-card" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-card" />
        ))}
        <div className="mt-auto flex items-center gap-[10px] border-t border-line px-1.5 py-2.5">
          <Skeleton className="h-[30px] w-[30px] rounded-pill" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-12 flex-none items-center gap-2 border-b border-line px-4 md:gap-3 md:px-7">
          {/* Hamburger placeholder — below sm only */}
          <Skeleton className="size-[28px] rounded-control sm:hidden" />
          <Skeleton className="h-5 w-32 sm:w-40" />
          <Skeleton className="ml-auto h-[28px] w-16" />
        </header>
        <div className="mx-auto w-full max-w-[1180px] px-4 py-5 md:px-7 md:py-7">
          {children ?? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-[14px] lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[92px] rounded-card" />
                ))}
              </div>
              <Skeleton className="mb-3 h-7 w-48 sm:w-56" />
              <div className="overflow-hidden rounded-card border border-line bg-surface-card shadow-soft-lit">
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
