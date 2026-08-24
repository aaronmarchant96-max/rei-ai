import {
  wilsonInterval,
  buildPrecedentCorpus,
  selectCohort,
  computePrecedentRisk,
  MIN_TIER_SUPPORT,
  SUPPORTED_EVIDENCE,
  type Precedent,
} from "./routePrecedents";
import type { RoutePredictionFeatures } from "./routePredictionTypes";
import type { RouteOutcome } from "./routeOutcome";

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

function outcome(overrides: Partial<RouteOutcome> & { requestId: string }): RouteOutcome {
  const { requestId, ...rest } = overrides;
  return {
    schemaVersion: 1,
    requestId,
    routeId: "structured-reasoning",
    selectedModel: "model-A",
    executedModel: "model-A",
    modelIdentityProvenance: "observed",
    delivery: { status: "success", provenance: "derived", basis: ["status", "finalTruncated"] },
    execution: {},
    quality: { status: "unknown", evaluations: [] },
    safety: { status: "pass", evaluations: [] },
    routingPolicy: { status: "unknown" },
    observedAt: "2026-08-23T12:05:00.000Z",
    observedAtProvenance: "routing-outcome",
    ...rest,
  };
}

function pred(requestId: string, predictedAt: string, features: RoutePredictionFeatures = feat()) {
  return {
    schemaVersion: 1 as const,
    id: `prediction:${requestId}:route-precedent-v1:delivery_failure`,
    requestId,
    predictorVersion: "route-precedent-v1",
    target: "delivery_failure" as const,
    predictedAt,
    features,
    failureRisk: null as number | null,
    support: { total: 0, successes: 0, failures: 0 },
    evidenceQuality: "unavailable" as const,
    precedentTier: "none" as const,
    corpusWindow: { before: predictedAt },
  };
}

function precedent(requestId: string, predictedAt: string, obsAt: string, delivery: "success" | "failure"): Precedent {
  return {
    prediction: pred(requestId, predictedAt),
    outcome: outcome({ requestId, delivery: { status: delivery, provenance: "derived", basis: ["status", "finalTruncated"] }, observedAt: obsAt }),
  };
}

describe("wilsonInterval — known-value fixtures", () => {
  it("5 failures / 41 total ≈ 12.2% (5.3%–25.5%)", () => {
    const w = wilsonInterval(5, 41)!;
    expect(w.low).toBeCloseTo(0.053, 2);
    expect(w.high).toBeCloseTo(0.255, 2);
  });

  it("0 failures / 1 total → risk 0 with a wide nonzero interval", () => {
    const w = wilsonInterval(0, 1)!;
    expect(w.low).toBeCloseTo(0, 5);
    expect(w.high).toBeGreaterThan(0.5); // wide
    expect(w.high).toBeLessThan(1);
  });

  it("zero/negative support → null", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(0, -1)).toBeNull();
  });

  it("invalid failures (> total) → null", () => {
    expect(wilsonInterval(5, 4)).toBeNull();
  });

  it("clamps into [0,1]", () => {
    const w = wilsonInterval(0, 1)!;
    expect(w.low).toBeGreaterThanOrEqual(0);
    expect(w.high).toBeLessThanOrEqual(1);
  });
});

describe("buildPrecedentCorpus — temporal eligibility", () => {
  const currentPredictedAt = "2026-08-23T13:00:00.000Z";

  it("excludes a precedent whose outcome was observed after the current prediction (concurrency leakage)", () => {
    // A predicted 12:00, outcome observed 12:02; B predicted 12:01.
    const a = precedent("req-A", "2026-08-23T12:00:00.000Z", "2026-08-23T12:02:00.000Z", "failure");
    const corpus = buildPrecedentCorpus([a.prediction], [a.outcome], "req-B", "2026-08-23T12:01:00.000Z");
    expect(corpus).toHaveLength(0);
  });

  it("includes a precedent observed before the current prediction", () => {
    const a = precedent("req-A", "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "failure");
    const corpus = buildPrecedentCorpus([a.prediction], [a.outcome], "req-B", currentPredictedAt);
    expect(corpus).toHaveLength(1);
  });

  it("excludes outcomes with unknown delivery status", () => {
    const a = precedent("req-A", "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "success");
    a.outcome = { ...a.outcome, delivery: { status: "unknown", provenance: "derived", basis: [] } };
    const corpus = buildPrecedentCorpus([a.prediction], [a.outcome], "req-B", currentPredictedAt);
    expect(corpus).toHaveLength(0);
  });

  it("excludes outcomes without observability proof", () => {
    const a = precedent("req-A", "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "success");
    a.outcome = { ...a.outcome, observedAt: undefined, observedAtProvenance: "unavailable" };
    const corpus = buildPrecedentCorpus([a.prediction], [a.outcome], "req-B", currentPredictedAt);
    expect(corpus).toHaveLength(0);
  });

  it("excludes self (same requestId)", () => {
    const a = precedent("req-B", "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "failure");
    const corpus = buildPrecedentCorpus([a.prediction], [a.outcome], "req-B", currentPredictedAt);
    expect(corpus).toHaveLength(0);
  });

  it("excludes incompatible feature-schema snapshots", () => {
    const a = precedent("req-A", "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "failure");
    a.prediction.features = { ...a.prediction.features, schemaVersion: 2 as never };
    const corpus = buildPrecedentCorpus([a.prediction], [a.outcome], "req-B", currentPredictedAt);
    expect(corpus).toHaveLength(0);
  });
});

describe("selectCohort — tier selection", () => {
  function makeCorpus(n: number, features: RoutePredictionFeatures): Precedent[] {
    return Array.from({ length: n }, (_, i) => precedent(`req-${i}`, "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "success"));
  }

  it("returns none when selectedModel is missing (no unknown-model pooling)", () => {
    const f = feat({ selectedModel: undefined });
    const corpus = makeCorpus(20, f);
    const { tier, precedents } = selectCohort(f, corpus);
    expect(tier).toBe("none");
    expect(precedents).toHaveLength(0);
  });

  it("uses EXACT when it has >= MIN_TIER_SUPPORT", () => {
    const f = feat();
    const corpus = makeCorpus(MIN_TIER_SUPPORT, f);
    expect(selectCohort(f, corpus).tier).toBe("exact");
  });

  it("falls back to RELAXED when exact is thin but relaxed is rich", () => {
    const f = feat({ adversarialBand: "high" });
    const corpus = [
      ...makeCorpus(2, f), // exact matches (2, thin)
      ...makeCorpus(MIN_TIER_SUPPORT, feat({ adversarialBand: "clean" })), // relaxed matches (same except adversarialBand)
    ];
    expect(selectCohort(f, corpus).tier).toBe("relaxed");
  });

  it("uses narrowest non-empty tier when nothing reaches MIN_TIER_SUPPORT (sparse)", () => {
    const f = feat();
    const corpus = makeCorpus(2, f); // only 2 exact
    const { tier, precedents } = selectCohort(f, corpus);
    expect(tier).toBe("exact");
    expect(precedents).toHaveLength(2);
  });
});

describe("computePrecedentRisk — end-to-end", () => {
  const predictedAt = "2026-08-23T13:00:00.000Z";

  it("zero evidence → null risk, unavailable, none", () => {
    const r = computePrecedentRisk(feat(), "req-cur", predictedAt, [], []);
    expect(r.failureRisk).toBeNull();
    expect(r.riskInterval95).toBeNull();
    expect(r.support).toEqual({ total: 0, successes: 0, failures: 0 });
    expect(r.evidenceQuality).toBe("unavailable");
    expect(r.precedentTier).toBe("none");
  });

  it("computes a real risk from failures/successes", () => {
    const prior = Array.from({ length: 10 }, (_, i) =>
      precedent(`req-${i}`, "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", i < 2 ? "failure" : "success")
    );
    const r = computePrecedentRisk(
      feat(),
      "req-cur",
      predictedAt,
      prior.map((p) => p.prediction),
      prior.map((p) => p.outcome)
    );
    expect(r.failureRisk).toBeCloseTo(0.2, 5);
    expect(r.support).toEqual({ total: 10, successes: 8, failures: 2 });
    expect(r.evidenceQuality).toBe("sparse"); // 10 < 20
    expect(r.precedentTier).toBe("exact");
    expect(r.riskInterval95).not.toBeNull();
  });

  it("supported evidence at >= SUPPORTED_EVIDENCE", () => {
    const prior = Array.from({ length: SUPPORTED_EVIDENCE }, (_, i) =>
      precedent(`req-${i}`, "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", "success")
    );
    const r = computePrecedentRisk(feat(), "req-cur", predictedAt, prior.map((p) => p.prediction), prior.map((p) => p.outcome));
    expect(r.evidenceQuality).toBe("supported");
    expect(r.failureRisk).toBe(0);
    expect(r.riskInterval95).not.toBeNull();
  });

  it("is deterministic regardless of source-array order", () => {
    const mk = () => {
      const prior = Array.from({ length: 8 }, (_, i) =>
        precedent(`req-${i}`, "2026-08-23T12:00:00.000Z", "2026-08-23T12:30:00.000Z", i % 4 === 0 ? "failure" : "success")
      );
      return prior;
    };
    const a = mk();
    const b = [...a].reverse();
    const ra = computePrecedentRisk(feat(), "req-cur", predictedAt, a.map((p) => p.prediction), a.map((p) => p.outcome));
    const rb = computePrecedentRisk(feat(), "req-cur", predictedAt, b.map((p) => p.prediction), b.map((p) => p.outcome));
    expect(ra).toEqual(rb);
  });

  it("corpus window records the earliest used prediction time", () => {
    const prior = Array.from({ length: 6 }, (_, i) =>
      precedent(`req-${i}`, `2026-08-23T${String(10 + i).padStart(2, "0")}:00:00.000Z`, "2026-08-23T12:30:00.000Z", "success")
    );
    const r = computePrecedentRisk(feat(), "req-cur", predictedAt, prior.map((p) => p.prediction), prior.map((p) => p.outcome));
    expect(r.corpusWindow.before).toBe(predictedAt);
    expect(r.corpusWindow.earliest).toBe("2026-08-23T10:00:00.000Z");
  });
});

describe("computePrecedentRisk — feature mutation sensitivity", () => {
  const predictedAt = "2026-08-23T13:00:00.000Z";

  function corpusWithFailureOnLargeInput(): Precedent[] {
    return Array.from({ length: 10 }, (_, i) => {
      const large = i >= 5;
      return precedent(
        `req-${i}`,
        "2026-08-23T12:00:00.000Z",
        "2026-08-23T12:30:00.000Z",
        large ? "failure" : "success"
      );
    });
  }

  it("relevant feature mutation (input size) can change the cohort", () => {
    const prior = corpusWithFailureOnLargeInput();
    // But set the cohort's inputSizeBand to match the "large" failure group.
    const large = prior.map((p, i) => {
      const features = { ...p.prediction.features, inputSizeBand: "large" as const };
      return { prediction: { ...p.prediction, features }, outcome: p.outcome };
    });
    const r = computePrecedentRisk(
      feat({ inputSizeBand: "large" }),
      "req-cur",
      predictedAt,
      large.map((p) => p.prediction),
      large.map((p) => p.outcome)
    );
    expect(r.failureRisk).toBeCloseTo(0.5, 5);
  });

  it("irrelevant feature mutation (escalationExpected) leaves the cohort unchanged", () => {
    const prior = corpusWithFailureOnLargeInput();
    const a = computePrecedentRisk(feat(), "req-cur", predictedAt, prior.map((p) => p.prediction), prior.map((p) => p.outcome));
    const b = computePrecedentRisk(feat({ escalationExpected: true }), "req-cur", predictedAt, prior.map((p) => p.prediction), prior.map((p) => p.outcome));
    // escalationExpected is not part of any tier → identical risk
    expect(b.failureRisk).toBe(a.failureRisk);
    expect(b.precedentTier).toBe(a.precedentTier);
  });
});
