"use client";

import { SectionError } from "@/components/section-error";

// Group-level boundary: an error in any portal/reports page is caught here as a
// contained, recoverable panel instead of the root full-screen error.
export default function ClientError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError {...props} />;
}
