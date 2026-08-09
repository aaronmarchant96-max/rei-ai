import { computeEvalReplay } from "./evalReplayStats";
import type { EvalEntry } from "./evalLog";

const entry = (requestId: string, routeExpected: boolean, routeCorrect: boolean, safetyVerdict?: "clean" | "suspicious" | "high-risk" | "critical"): EvalEntry => ({
  requestId,
  domain: "assistant",
  routeId: "x",
  model: "deepseek-v4-flash",
  evaluator: "deterministic",
  evaluation: {
    routeExpected,
    routeCorrect,
    safetyVerdict,
    evaluatedAt: "2026-08-04T01:00:00.000Z",
  },
});

describe("computeEvalReplay", () => {
  it("returns zeros for an empty corpus", () => {
    const r = computeEvalReplay([]);
    expect(r.totalEvaluated).toBe(0);
    expect(r.escalatedCount).toBe(0);
    expect(r.adherencePct).toBeNull();
  });

  it("computes pooled adherence across escalated entries", () => {
    const r = computeEvalReplay([
      entry("a", true, true),
      entry("b", true, false),
      entry("c", true, true),
      entry("d", false, true), // clean request — not in adherence denominator
    ]);
    expect(r.totalEvaluated).toBe(4);
    expect(r.escalatedCount).toBe(3);
    expect(r.hits).toBe(2);
    expect(r.misses).toBe(1);
    expect(r.adherencePct).toBe(67);
  });

  it("counts non-clean safety verdicts", () => {
    const r = computeEvalReplay([
      entry("a", true, true, "high-risk"),
      entry("b", false, true, "clean"),
    ]);
    expect(r.safetyFailures).toBe(1);
  });
});
