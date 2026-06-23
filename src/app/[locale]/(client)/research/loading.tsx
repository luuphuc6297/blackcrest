import { AppShellSkeleton, Skeleton } from "@/components/skeleton";

// Instant shell + chart placeholders while the (force-dynamic) dashboard streams.
export default function ResearchLoading() {
  return (
    <AppShellSkeleton>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-7">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-card" />
          ))}
        </div>
        <Skeleton className="h-[316px] rounded-card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[292px] rounded-card" />
          <Skeleton className="h-[292px] rounded-card" />
        </div>
      </div>
    </AppShellSkeleton>
  );
}
