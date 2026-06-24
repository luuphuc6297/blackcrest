import { Skeleton } from "@/components/skeleton";

// Content-only skeleton: the shell (sidebar + header) is persistent in the
// layout, so a route change only swaps THIS content area — no shell flicker.
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-6 sm:px-7">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-card" />
        ))}
      </div>
      <Skeleton className="h-[280px] rounded-card" />
    </div>
  );
}
