import { evaluateWalkForward } from "../lib/routePredictionEval";
import type { RoutePrediction, RoutePredictionFeatures } from "../lib/routePredictionTypes";
import type { RouteOutcome } from "../lib/routeOutcome";

const t = (hour: number, minute = 0) =>
  `2026-08-23T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;

function feat(overrides: Partial<RoutePredictionFeatures> = {}): RoutePredictionFeatures {
  return {
    schemaVersion: 1,
    routeId: "structured-reasoning",
    domain: "assistant",
    selectedModel: "model-A",
    hingeBand: "medium",
    structured: true,
    escalationExpected: false,
    adversarialBand: "clean",
    inputSizeBand: "small",
    ...overrides,
  };
}

function pred(
  requestId: string,
  predictedAt: string,
  risk: number | null,
  overrides: Partial<RoutePrediction> = {}
): RoutePrediction {
  return {
    schemaVersion: 1,
    id: `prediction:${requestId}:route-precedent-v1:delivery_failure`,
    requestId,
    predictorVersion: "route-precedent-v1",
    target: "delivery_failure",
    predictedAt,
    features: feat(overrides.features),
    failureRisk: risk,
    riskInterval95: risk === null ? null : { low: Math.max(0, risk - 0.2), high: Math.min(1, risk + 0.2) },
    support: risk === null ? { total: 0, successes: 0, failures: 0 } : { total: 10, successes: 5, failures: 5 },
    evidenceQuality: risk === null ? "unavailable" : "sparse",
    precedentTier: risk === null ? "none" : "exact",
    corpusWindow: { before: predictedAt },
    ...overrides,
  };
}

function outcome(
  requestId: string,
  observedAt: string,
  delivery: "success" | "failure",
  overrides: Partial<RouteOutcome> = {}
): RouteOutcome {
  return {
    schemaVersion: 1,
    requestId,
    routeId: "structured-reasoning",
    selectedModel: "model-A",
    executedModel: "model-A",
    modelIdentityProvenance: "observed",
    delivery: { status: delivery, provenance: "derived", basis: ["status", "finalTruncated"] },
    execution: {},
    quality: { status: "unknown", evaluations: [] },
    safety: { status: "pass", evaluations: [] },
    routingPolicy: { status: "unknown" },
    observedAt,
    observedAtProvenance: "routing-outcome",
    ...overrides,
  };
}

describe("Route prediction — walk-forward evaluation harness", () => {
  it("reports coverage = scorable / eligible", () => {
    const predictions = [
      pred("req-1", t(10, 0), 0.5),
      pred("req-2", t(10, 10), 0.3),
      pred("req-3", t(10, 20), null), // no evidence → not scorable
      pred("req-4", t(10, 30), 0.8),
      pred("req-5", t(10, 40), 0.5),
    ];
    const outcomes = [
      outcome("req-1", t(10, 5), "success"),
      outcome("req-2", t(10, 15), "failure"),
      outcome("req-3", t(10, 25), "success"),
      outcome("req-4", t(10, 35), "success"),
      outcome("req-5", t(10, 45), "failure"),
    ];
    const r = evaluateWalkForward(predictions, outcomes);
    expect(r.eligible).toBe(5);
    expect(r.scorable).toBe(4);
    expect(r.coverage).toBeCloseTo(0.8, 10);
    expect(r.brier).toBeGreaterThan(0);
    expect(r.auroc).toBeGreaterThanOrEqual(0);
    expect(r.auroc).toBeLessThanOrEqual(1);
  });

  it("excludes equal-timestamp outcomes conservatively", () => {
    const predictions = [pred("req-1", t(10, 0), 0.5)];
    const outcomes = [outcome("req-1", t(10, 0), "failure")]; // equal timestamp
    const r = evaluateWalkForward(predictions, outcomes);
    expect(r.eligible).toBe(0);
    expect(r.coverage).toBeNull();
  });

  it("excludes predictions whose outcome is unobserved or unknown", () => {
    const predictions = [
      pred("req-1", t(10, 0), 0.5),
      pred("req-2", t(10, 10), 0.3),
    ];
    const outcomes = [
      outcome("req-1", t(10, 5), "success"),
      // req-2 outcome delivery unknown → excluded
      { ...outcome("req-2", t(10, 15), "success"), delivery: { status: "unknown" as const, provenance: "derived" as const, basis: [] } },
    ];
    const r = evaluateWalkForward(predictions, outcomes);
    expect(r.eligible).toBe(1);
  });

  it("baselines use only outcomes observed strictly before the prediction", () => {
    // P1 at 10:00 has no prior outcome → no baseline can score it.
    const predictions = [pred("req-1", t(10, 0), 0.5), pred("req-2", t(10, 10), 0.3)];
    const outcomes = [outcome("req-1", t(10, 5), "success"), outcome("req-2", t(10, 15), "failure")];
    const r = evaluateWalkForward(predictions, outcomes);
    // P2's global baseline has one prior outcome (req-1); P1's has none.
    const global = r.baselineComparisons.find((b) => b.id === "global")!;
    expect(global.matchedCount).toBe(1);
    expect(global.baselineBrier).not.toBeNull();
  });

  it("is deterministic regardless of input array order", () => {
    const predictions = [
      pred("req-1", t(10, 0), 0.5),
      pred("req-2", t(10, 10), 0.3),
      pred("req-3", t(10, 20), 0.7),
    ];
    const outcomes = [
      outcome("req-1", t(10, 5), "success"),
      outcome("req-2", t(10, 15), "failure"),
      outcome("req-3", t(10, 25), "failure"),
    ];
    const a = evaluateWalkForward(predictions, outcomes);
    const b = evaluateWalkForward([...predictions].reverse(), [...outcomes].reverse());
    expect(a).toEqual(b);
  });

  it("flags duplicate prediction ids", () => {
    const p = pred("req-1", t(10, 0), 0.5);
    const dup = { ...p, predictedAt: t(10, 1) };
    const predictions = [p, dup];
    const outcomes = [outcome("req-1", t(10, 5), "success")];
    const r = evaluateWalkForward(predictions, outcomes);
    expect(r.duplicatePredictionIds).toContain(p.id);
    expect(r.eligible).toBe(1); // deduped, not double-counted
  });

  it("reporting a predictor that loses to a simpler baseline is a valid result", () => {
    // Predictor's risks are noisy; the model-route baseline is near-perfect.
    const predictions = [
      pred("req-1", t(10, 0), 0.5),
      pred("req-2", t(10, 10), 0.4),
      pred("req-3", t(10, 20), 0.6),
    ];
    const outcomes = [
      outcome("req-1", t(10, 5), "success"),
      outcome("req-2", t(10, 15), "success"),
      outcome("req-3", t(10, 25), "success"),
    ];
    const r = evaluateWalkForward(predictions, outcomes);
    expect(r.brier).toBeGreaterThan(0); // predictor wasn't perfect
    // Baselines exist and are computed on the matched population.
    const mr = r.baselineComparisons.find((b) => b.id === "model-route")!;
    expect(mr.matchedCount).toBeGreaterThan(0);
    expect(mr.baselineBrier).not.toBeNull();
    // A valid result: the harness reports the honest comparison without a win threshold.
    expect(typeof mr.predictorBrier).toBe("number");
  });
});
