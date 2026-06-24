import { Skeleton } from "@/components/skeleton";

// The PDF viewer renders full-screen (outside the shell), so its loading state is
// a full-height placeholder rather than a content-area skeleton.
export default function ViewerLoading() {
  return (
    <div className="flex h-[100dvh] flex-col bg-surface">
      <Skeleton className="h-12 w-full rounded-none" />
      <div className="flex flex-1 items-center justify-center p-6">
        <Skeleton className="h-full w-[min(820px,92%)] rounded-card" />
      </div>
    </div>
  );
}
