import type { ReportStatus } from "@prisma/client";

/**
 * Report lifecycle state machine (SEC-09). Pure + dependency-free so it is unit
 * testable and is the SINGLE source the reviewReport server action enforces —
 * the test checks the same map the runtime uses (no drift).
 *
 *   DRAFT → REVIEW → APPROVED → PUBLISHED       (forward path)
 *   REVIEW | APPROVED → REJECTED                (kickback)
 */
export type ReviewDecision = "approve" | "reject" | "publish";

export const REVIEW_TRANSITIONS: Record<
  ReviewDecision,
  { from: ReportStatus[]; to: ReportStatus }
> = {
  approve: { from: ["REVIEW"], to: "APPROVED" },
  reject: { from: ["REVIEW", "APPROVED"], to: "REJECTED" },
  publish: { from: ["APPROVED"], to: "PUBLISHED" },
};

/** Target status if the decision is legal from `current`, else null. */
export function resolveReportTransition(
  decision: ReviewDecision,
  current: ReportStatus,
): ReportStatus | null {
  const rule = REVIEW_TRANSITIONS[decision];
  return rule.from.includes(current) ? rule.to : null;
}
