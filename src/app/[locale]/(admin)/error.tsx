"use client";

import { SectionError } from "@/components/section-error";

// Group-level boundary: an error in any /admin page is caught here as a contained,
// recoverable panel instead of bubbling to the root full-screen error.
export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError {...props} />;
}
