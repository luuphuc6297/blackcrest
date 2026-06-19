import { describe, it, expect } from "vitest";
import {
  REVIEW_TRANSITIONS,
  resolveReportTransition,
  nextForwardDecision,
  canReject,
} from "../report-transitions";

// This is the SAME map reviewReport enforces (SEC-09) — testing it here proves
// the guard rejects illegal lifecycle jumps.
describe("report state machine (SEC-09)", () => {
  it("allows the forward path approve(REVIEW)→APPROVED, publish(APPROVED)→PUBLISHED", () => {
    expect(resolveReportTransition("approve", "REVIEW")).toBe("APPROVED");
    expect(resolveReportTransition("publish", "APPROVED")).toBe("PUBLISHED");
  });

  it("allows reject from REVIEW or APPROVED", () => {
    expect(resolveReportTransition("reject", "REVIEW")).toBe("REJECTED");
    expect(resolveReportTransition("reject", "APPROVED")).toBe("REJECTED");
  });

  it("REJECTS illegal jumps", () => {
    // can't publish straight from REVIEW (must be approved first)
    expect(resolveReportTransition("publish", "REVIEW")).toBeNull();
    // can't approve an already-published report
    expect(resolveReportTransition("approve", "PUBLISHED")).toBeNull();
    // can't approve a draft (must be submitted to REVIEW first)
    expect(resolveReportTransition("approve", "DRAFT")).toBeNull();
    // can't re-publish / mutate a published report via reject path edge
    expect(resolveReportTransition("publish", "PUBLISHED")).toBeNull();
    expect(resolveReportTransition("approve", "REJECTED")).toBeNull();
    expect(resolveReportTransition("publish", "ARCHIVED")).toBeNull();
  });

  it("every decision targets a distinct forward/terminal status", () => {
    expect(REVIEW_TRANSITIONS.approve.to).toBe("APPROVED");
    expect(REVIEW_TRANSITIONS.reject.to).toBe("REJECTED");
    expect(REVIEW_TRANSITIONS.publish.to).toBe("PUBLISHED");
  });

  it("submit moves DRAFT or a kicked-back REJECTED report into REVIEW", () => {
    expect(resolveReportTransition("submit", "DRAFT")).toBe("REVIEW");
    expect(resolveReportTransition("submit", "REJECTED")).toBe("REVIEW");
    // …but not from a status that is already in/past review
    expect(resolveReportTransition("submit", "REVIEW")).toBeNull();
    expect(resolveReportTransition("submit", "PUBLISHED")).toBeNull();
  });
});

// The viewer + admin table both surface actions from these helpers, so the UI
// can never offer an action the state machine would reject.
describe("status → available actions (UI consistency)", () => {
  it("exposes exactly one forward action per status (none for terminal)", () => {
    expect(nextForwardDecision("DRAFT")).toBe("submit");
    expect(nextForwardDecision("REJECTED")).toBe("submit");
    expect(nextForwardDecision("REVIEW")).toBe("approve");
    expect(nextForwardDecision("APPROVED")).toBe("publish");
    expect(nextForwardDecision("PUBLISHED")).toBeNull();
    expect(nextForwardDecision("ARCHIVED")).toBeNull();
  });

  it("only allows reject from REVIEW or APPROVED", () => {
    expect(canReject("REVIEW")).toBe(true);
    expect(canReject("APPROVED")).toBe(true);
    expect(canReject("DRAFT")).toBe(false);
    expect(canReject("PUBLISHED")).toBe(false);
    expect(canReject("REJECTED")).toBe(false);
  });
});
