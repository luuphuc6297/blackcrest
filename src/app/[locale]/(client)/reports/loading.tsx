import { LibraryGridSkeleton } from "@/components/skeleton";

// Content-only skeleton for the library (shell is persistent in the layout).
export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7">
      <LibraryGridSkeleton />
    </div>
  );
}
