import type { ReportStatus, UserStatus, AccessLevel } from "@prisma/client";
import type { BadgeTone } from "@/components/ui/badge";

/**
 * Single source of truth for status → Badge tone + message key (blueprint status
 * model). Replaces the per-screen STATUS_TONE / STATUS_KEY / DOT_BG duplicates.
 * Callers translate the `key` with the "Status" namespace.
 */
export const REPORT_STATUS: Record<ReportStatus, { tone: BadgeTone; key: string }> = {
  DRAFT: { tone: "draft", key: "draft" },
  REVIEW: { tone: "review", key: "review" },
  APPROVED: { tone: "approved", key: "approved" },
  PUBLISHED: { tone: "published", key: "published" },
  REJECTED: { tone: "rejected", key: "rejected" },
  ARCHIVED: { tone: "neutral", key: "archived" },
};

export const ACCOUNT_STATUS: Record<UserStatus, { tone: BadgeTone; key: string }> = {
  PENDING: { tone: "review", key: "pending" },
  APPROVED: { tone: "approved", key: "active" },
  SUSPENDED: { tone: "danger", key: "suspended" },
};

/** Access level → message key (namespace "Access"). */
export const ACCESS_LEVEL_KEY: Record<AccessLevel, string> = {
  PUBLIC: "public",
  RESTRICTED: "restricted",
};
