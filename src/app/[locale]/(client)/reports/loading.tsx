import { AppShellSkeleton, LibraryGridSkeleton } from "@/components/skeleton";

// Shown the instant the library route is entered, while the (force-dynamic) page
// streams its data — replaces the previous "frozen old page" wait with an
// immediate shell + card-grid skeleton.
export default function ReportsLoading() {
  return (
    <AppShellSkeleton>
      <LibraryGridSkeleton />
    </AppShellSkeleton>
  );
}
