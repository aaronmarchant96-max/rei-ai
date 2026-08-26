import { detectCActivitySignals, DETECTOR_VERSION } from "./cActivitySignals";
import type { CanonicalObservation } from "./routePredictionEval";
import { wilsonInterval } from "./routePrecedents";

let globalIdSeq = 0;

function mockObservation(
  model: string,
  routeId: string,
  actualFailure: number,
  predictedRisk: number | null,
  observedAt: string,
  extraFeatures: any = {},
  requestIdOverride?: string
): CanonicalObservation {
  globalIdSeq++;
  const idStr = globalIdSeq.toString();
  return {
    prediction: {
      id: `p${idStr}`,
      requestId: requestIdOverride || `r${idStr}`,
      predictedAt: "2026-08-11T00:00:00Z",
      failureRisk: predictedRisk,
      schemaVersion: 1,
      predictorVersion: "v1",
      target: "delivery_failure",
      support: { total: 100, successes: 50, failures: 50 },
      features: {
        schemaVersion: "route-prediction-v1",
        selectedModel: model,
        routeId: routeId,
        domain: "test-domain",
        hingeBand: "low",
        structured: false,
        adversarialBand: "none",
        inputSizeBand: "small",
        ...extraFeatures
      }
    } as any,
    outcome: {
      requestId: requestIdOverride || `r${idStr}`,
      delivery: { status: actualFailure ? "failure" : "success", provenance: "derived", basis: [] },
      observedAtProvenance: "routing-outcome",
      observedAt: observedAt,
      routeId: routeId,
      selectedModel: model
    } as any,
    actualFailure,
    predictedRisk
  };
}

describe("C-Activity Signals: Delivery Risk", () => {
  it("detects persistent-delivery-risk when cohort Wilson lower bound > comparator Wilson upper bound", () => {
    const obs: CanonicalObservation[] = [];
    // Cohort: 20 failures out of 20
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelA", "routeX", 1, 0.5, "2026-08-11T00:00:00Z", { domain: "d1" }));
    // Comparator: 0 failures out of 20
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelA", "routeX", 0, 0.5, "2026-08-11T00:00:00Z", { domain: "d2" }));
    
    const result = detectCActivitySignals(obs);
    const risks = result.signals.filter(s => s.type === "persistent-delivery-risk");
    expect(risks).toHaveLength(1);
  });

  it("suppresses when overlapping intervals (fails lower bound check)", () => {
    const obs: CanonicalObservation[] = [];
    // Cohort: 10/20 failures
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelA", "routeX", i % 2, 0.5, "2026-08-11T00:00:00Z", { domain: "d1" }));
    // Comparator: 10/20 failures
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelA", "routeX", i % 2, 0.5, "2026-08-11T00:00:00Z", { domain: "d2" }));
    
    const result = detectCActivitySignals(obs);
    expect(result.signals.filter(s => s.type === "persistent-delivery-risk")).toHaveLength(0);
    expect(result.suppressed.overlappingIntervals).toBeGreaterThan(0);
  });

  it("enforces cohort support boundary (19 drops)", () => {
    const obs: CanonicalObservation[] = [];
    for (let i = 0; i < 19; i++) obs.push(mockObservation("modelA", "routeX", 1, 0.5, "2026-08-11T00:00:00Z", { domain: "d1" }));
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelA", "routeX", 0, 0.5, "2026-08-11T00:00:00Z", { domain: "d2" }));
    const result = detectCActivitySignals(obs);
    expect(result.signals.filter(s => s.type === "persistent-delivery-risk")).toHaveLength(0);
    expect(result.suppressed.insufficientSupport).toBeGreaterThan(0);
  });

  it("enforces comparator support boundary (19 drops)", () => {
    const obs: CanonicalObservation[] = [];
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelA", "routeX", 1, 0.5, "2026-08-11T00:00:00Z", { domain: "d1" }));
    for (let i = 0; i < 19; i++) obs.push(mockObservation("modelA", "routeX", 0, 0.5, "2026-08-11T00:00:00Z", { domain: "d2" }));
    const result = detectCActivitySignals(obs);
    expect(result.signals.filter(s => s.type === "persistent-delivery-risk")).toHaveLength(0);
    expect(result.suppressed.unavailableComparator).toBe(1);
  });
});

describe("C-Activity Signals: Miscalibration", () => {
  it("detects underprediction correctly", () => {
    const obs: CanonicalObservation[] = [];
    // Predicted 0.1, actual 1
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelB", "routeY", 1, 0.15, "2026-08-11T00:00:00Z"));
    
    const result = detectCActivitySignals(obs);
    const sig = result.signals.find(s => s.type === "prediction-miscalibration") as any;
    expect(sig).toBeDefined();
    expect(sig.direction).toBe("underpredicting");
    expect(sig.model).toBe("modelB");
    expect(sig.id).toContain(DETECTOR_VERSION);
  });

  it("detects overprediction correctly", () => {
    const obs: CanonicalObservation[] = [];
    // Predicted 0.9, actual 0
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelB", "routeY", 0, 0.95, "2026-08-11T00:00:00Z"));
    
    const result = detectCActivitySignals(obs);
    const sig = result.signals.find(s => s.type === "prediction-miscalibration") as any;
    expect(sig).toBeDefined();
    expect(sig.direction).toBe("overpredicting");
  });
});

describe("C-Activity Signals: Cohort Drift", () => {
  it("detects increasing drift on >40 adjacent-window semantics", () => {
    const obs: CanonicalObservation[] = [];
    // Earliest 5 are ignored (count = 45)
    for (let i = 0; i < 5; i++) obs.push(mockObservation("modelC", "routeZ", 0, 0.5, `2026-08-11T10:00:00Z`));
    
    // Previous 20 (index -40 to -20) -> 0 failures
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelC", "routeZ", 0, 0.5, `2026-08-11T10:00:01Z`));
    
    // Recent 20 (index -20 to end) -> 20 failures
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelC", "routeZ", 1, 0.5, `2026-08-11T10:00:02Z`));
    
    const result = detectCActivitySignals(obs);
    const drift = result.signals.find(s => s.type === "cohort-drift") as any;
    expect(drift).toBeDefined();
    expect(drift.direction).toBe("increasing");
  });

  it("detects decreasing drift", () => {
    const obs: CanonicalObservation[] = [];
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelC", "routeZ", 1, 0.5, `2026-08-11T10:00:00Z`));
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelC", "routeZ", 0, 0.5, `2026-08-11T10:00:01Z`));
    
    const result = detectCActivitySignals(obs);
    const drift = result.signals.find(s => s.type === "cohort-drift") as any;
    expect(drift).toBeDefined();
    expect(drift.direction).toBe("decreasing");
  });
});

describe("C-Activity Signals: Core Determinism", () => {
  it("shuffled-input byte equivalence", () => {
    const obs: CanonicalObservation[] = [];
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelC", "routeZ", 0, 0.5, `2026-08-11T10:00:00Z`));
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelC", "routeZ", 1, 0.5, `2026-08-11T10:00:01Z`));
    
    const obsShuffled = [...obs].reverse();
    const result1 = detectCActivitySignals(obs);
    const result2 = detectCActivitySignals(obsShuffled);
    expect(JSON.stringify(result1)).toEqual(JSON.stringify(result2));
  });

  it("duplicate non-inflation", () => {
    const obs = mockObservation("modelA", "routeX", 1, 0.5, "2026-08-11T00:00:00Z");
    const arr = Array(40).fill(obs);
    const result = detectCActivitySignals(arr);
    // Suppressed because only 1 unique observation exists
    expect(result.corpus.eligible).toBe(1);
    expect(result.suppressed.insufficientSupport).toBeGreaterThan(0);
    expect(result.signals).toHaveLength(0);
  });

  it("equal observedAt ordering (tiebreaker uses durable ids)", () => {
    // Produce 40 observations all at the exact same observedAt
    const obs: CanonicalObservation[] = [];
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelE", "routeZ", 1, 0.5, "2026-08-11T00:00:00Z"));
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelE", "routeZ", 0, 0.5, "2026-08-11T00:00:00Z"));
    
    // Reversing shouldn't change the slice because sort is deterministic
    const r1 = detectCActivitySignals(obs);
    const r2 = detectCActivitySignals([...obs].reverse());
    expect(JSON.stringify(r1)).toEqual(JSON.stringify(r2));
  });

  it("unrelated-cohort invariance", () => {
    const obs1: CanonicalObservation[] = [];
    for (let i = 0; i < 20; i++) obs1.push(mockObservation("modelF", "routeF", 1, 0.9, "2026-08-11T00:00:00Z")); // well-calibrated (pred 0.9, actual 1)
    
    const obs2 = [...obs1];
    // Add completely unrelated cohort miscalibration
    for (let i = 0; i < 20; i++) obs2.push(mockObservation("modelG", "routeG", 1, 0.1, "2026-08-11T00:00:00Z"));
    
    const r1 = detectCActivitySignals(obs1);
    const r2 = detectCActivitySignals(obs2);
    
    expect(r1.signals.filter(s => (s as any).model === "modelF")).toEqual(
      r2.signals.filter(s => (s as any).model === "modelF")
    );
  });

  it("report privacy (no prompt-bearing content or outputs)", () => {
    const obs: CanonicalObservation[] = [];
    for (let i = 0; i < 20; i++) obs.push(mockObservation("modelH", "routeH", 1, 0.1, "2026-08-11T00:00:00Z"));
    const result = detectCActivitySignals(obs);
    const jsonStr = JSON.stringify(result);
    // Sanity checks that actual string literals or raw requests aren't embedded
    expect(jsonStr).not.toContain("prompt");
    expect(jsonStr).not.toContain("content");
  });
});
