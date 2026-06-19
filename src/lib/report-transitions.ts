import type { ReportStatus } from "@prisma/client";

/**
 * Report lifecycle state machine (SEC-09). Pure + dependency-free so it is unit
 * testable and is the SINGLE source the reviewReport server action enforces —
 * the test checks the same map the runtime uses (no drift).
 *
 *   DRAFT → REVIEW → APPROVED → PUBLISHED       (forward path)
 *   REVIEW | APPROVED → REJECTED                (kickback)
 *   DRAFT | REJECTED → REVIEW                   (submit / resubmit)
 */
export type ReviewDecision = "submit" | "approve" | "reject" | "publish";

/** The forward-progress decisions (everything except the reject kickback). */
export type ForwardDecision = Exclude<ReviewDecision, "reject">;

export const REVIEW_TRANSITIONS: Record<
  ReviewDecision,
  { from: ReportStatus[]; to: ReportStatus }
> = {
  // A fresh upload is DRAFT; submitting (or resubmitting a kicked-back report)
  // moves it into the review queue. Closes the dead-end where a DRAFT had no
  // forward action in the viewer/table.
  submit: { from: ["DRAFT", "REJECTED"], to: "REVIEW" },
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

/**
 * The single forward decision available from a given status (null for terminal
 * states). Shared by the viewer + admin table so both surface the SAME next
 * action — fixes the inconsistency where DRAFT showed nothing and PUBLISHED
 * still offered publish/reject.
 */
export function nextForwardDecision(
  current: ReportStatus,
): ForwardDecision | null {
  switch (current) {
    case "DRAFT":
    case "REJECTED":
      return "submit";
    case "REVIEW":
      return "approve";
    case "APPROVED":
      return "publish";
    default:
      return null; // PUBLISHED / ARCHIVED — no forward action
  }
}

/** Whether a report can still be sent back (rejected) from its current status. */
export function canReject(current: ReportStatus): boolean {
  return REVIEW_TRANSITIONS.reject.from.includes(current);
}
