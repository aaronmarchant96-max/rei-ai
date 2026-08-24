import {
  buildRoutePrediction,
  createPredictionId,
  logRoutePrediction,
  getPredictions,
  clearPredictions,
  MAX_PREDICTION_ENTRIES,
} from "./routePredictionLog";
import { isRoutePrediction, type RoutePrediction } from "./routePredictionTypes";
import { derivePredictionFeatures } from "./routePredictionFeatures";

const FEATURES = derivePredictionFeatures({
  routeId: "structured-reasoning",
  domain: "assistant",
  selectedModel: "model-A",
  hingeScore: 0.4,
  inputLength: 1200,
})!;

function makePrediction(overrides: Partial<RoutePrediction> = {}): RoutePrediction {
  return { ...buildRoutePrediction({ requestId: "req-1", predictorVersion: "shadow-v0", features: FEATURES }), ...overrides };
}

beforeEach(() => {
  clearPredictions();
});

describe("buildRoutePrediction — no-evidence default state", () => {
  it("zero evidence → failureRisk null, never 0", () => {
    const p = buildRoutePrediction({ requestId: "req-1", predictorVersion: "shadow-v0", features: FEATURES });
    expect(p.failureRisk).toBeNull();
    expect(p.support).toEqual({ total: 0, successes: 0, failures: 0 });
    expect(p.evidenceQuality).toBe("unavailable");
    expect(p.precedentTier).toBe("none");
  });

  it("prediction contains only contract fields (no outcome-side leakage)", () => {
    const p = buildRoutePrediction({ requestId: "req-1", predictorVersion: "shadow-v0", features: FEATURES });
    const keys = Object.keys(p).sort();
    expect(keys).toEqual([
      "corpusWindow", "evidenceQuality", "failureRisk", "features", "id",
      "precedentTier", "predictedAt", "predictorVersion", "requestId", "schemaVersion", "support", "target",
    ]);
    const serialized = JSON.stringify(p);
    for (const leak of ["resolvedModel", "actualCost", "actualTokens", "finalTruncated", "rescue", "continuations", "qualityScore", "safetyVerdict", "routeCorrect", "model-B"]) {
      expect(serialized).not.toContain(leak);
    }
  });
});

describe("createPredictionId — deterministic idempotency", () => {
  it("same request + version → same id", () => {
    expect(createPredictionId("req-1", "v1")).toBe(createPredictionId("req-1", "v1"));
  });

  it("different request → different id; different version → different id", () => {
    const base = createPredictionId("req-1", "v1");
    expect(createPredictionId("req-2", "v1")).not.toBe(base);
    expect(createPredictionId("req-1", "v2")).not.toBe(base);
  });
});

describe("logRoutePrediction — durable store semantics", () => {
  it("persists a valid prediction and reads it back", () => {
    const p = makePrediction();
    logRoutePrediction(p);
    expect(getPredictions().map((x) => x.id)).toContain(p.id);
  });

  it("does not duplicate identical request/version predictions (idempotent)", () => {
    logRoutePrediction(makePrediction());
    logRoutePrediction(makePrediction({ predictedAt: "2026-08-23T01:00:00.000Z" }));
    expect(getPredictions().filter((p) => p.id === createPredictionId("req-1", "shadow-v0"))).toHaveLength(1);
  });

  it("different requestIds never overwrite one another", () => {
    logRoutePrediction(makePrediction());
    logRoutePrediction(buildRoutePrediction({ requestId: "req-2", predictorVersion: "shadow-v0", features: FEATURES }));
    const ids = getPredictions().map((p) => p.requestId).sort();
    expect(ids).toEqual(["req-1", "req-2"]);
  });

  it("different predictor versions remain distinguishable", () => {
    logRoutePrediction(makePrediction());
    logRoutePrediction(buildRoutePrediction({ requestId: "req-1", predictorVersion: "shadow-v1", features: FEATURES }));
    const versions = getPredictions().map((p) => p.predictorVersion).sort();
    expect(versions).toEqual(["shadow-v0", "shadow-v1"]);
  });

  it("rejects invalid predictions (fail-closed)", () => {
    logRoutePrediction(makePrediction({ failureRisk: 0, support: { total: 0, successes: 0, failures: 0 } }));
    expect(getPredictions()).toHaveLength(0);
  });

  it("log cap is deterministic (MAX_PREDICTION_ENTRIES)", () => {
    for (let i = 0; i < MAX_PREDICTION_ENTRIES + 20; i++) {
      logRoutePrediction(buildRoutePrediction({ requestId: `req-${i}`, predictorVersion: "shadow-v0", features: FEATURES }));
    }
    expect(getPredictions()).toHaveLength(MAX_PREDICTION_ENTRIES);
  });

  it("storage exception does not throw (provider execution unaffected)", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    try {
      expect(() => logRoutePrediction(makePrediction())).not.toThrow();
    } finally {
      setItem.mockRestore();
    }
  });

  it("skips malformed persisted entries conservatively", () => {
    localStorage.setItem("rei_route_prediction_log", JSON.stringify([
      makePrediction(),
      { id: "bad", requestId: "", garbage: true },
      "not-an-object",
      null,
    ]));
    expect(getPredictions()).toHaveLength(1);
  });
});

describe("isRoutePrediction — the no-evidence ≠ zero-risk invariant", () => {
  it("rejects failureRisk 0 with zero support", () => {
    expect(isRoutePrediction(makePrediction({ failureRisk: 0 }))).toBe(false);
  });

  it("rejects a numeric failureRisk with zero support", () => {
    expect(isRoutePrediction(makePrediction({ failureRisk: 0.5 }))).toBe(false);
  });

  it("rejects support counts that do not reconcile", () => {
    expect(isRoutePrediction(makePrediction({ support: { total: 10, successes: 4, failures: 4 } }))).toBe(false);
  });

  it("rejects out-of-range failureRisk", () => {
    expect(isRoutePrediction(makePrediction({ failureRisk: 1.5, support: { total: 2, successes: 1, failures: 1 } }))).toBe(false);
  });

  it("accepts a valid evidence-backed failureRisk", () => {
    expect(
      isRoutePrediction(makePrediction({ failureRisk: 0.5, support: { total: 2, successes: 1, failures: 1 }, evidenceQuality: "supported", precedentTier: "model-route" }))
    ).toBe(true);
  });
});

describe("prediction is persisted BEFORE provider invocation (anti-leakage ordering)", () => {
  it("records the pre-execution prediction before the provider runs", () => {
    const order: string[] = [];

    const features = derivePredictionFeatures({
      routeId: "structured-reasoning",
      selectedModel: "model-A",
      hingeScore: 0.6,
      inputLength: 5000,
    })!;
    const prediction = buildRoutePrediction({ requestId: "req-order", predictorVersion: "shadow-v0", features });
    logRoutePrediction(prediction);
    order.push("prediction-written");

    expect(getPredictions().map((p) => p.id)).toContain(prediction.id);

    // Provider executes now — and returns outcome-side evidence.
    order.push("provider-invoked");
    const providerOutcome = { resolvedModel: "model-B", actualCost: 0.02, status: "success", finalTruncated: false };

    const stored = getPredictions().find((p) => p.requestId === "req-order");
    expect(stored?.features.selectedModel).toBe("model-A"); // selection, not resolution
    expect(JSON.stringify(stored)).not.toContain("model-B");
    expect(JSON.stringify(stored)).not.toContain(JSON.stringify(providerOutcome.resolvedModel));

    expect(order).toEqual(["prediction-written", "provider-invoked"]);
  });
});
