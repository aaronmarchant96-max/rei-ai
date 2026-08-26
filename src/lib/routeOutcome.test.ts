import { buildRouteOutcome } from "./routeOutcome";
import type { RoutingLogEntry } from "./routingLog";
import type { EvalEntry } from "./evalLog";

function routing(overrides: Partial<RoutingLogEntry> = {}): RoutingLogEntry {
  return {
    requestId: "req-1",
    routeId: "structured-reasoning",
    model: "model-A",
    resolvedModel: "model-A-001",
    timestamp: "2026-08-23T00:00:00.000Z",
    ...overrides,
  };
}

type EvalInput = {
  requestId?: string;
  evaluator?: EvalEntry["evaluator"];
  evaluatorVersion?: string;
  evaluation?: Partial<EvalEntry["evaluation"]>;
};

function evals(entries: EvalInput[] = []): EvalEntry[] {
  return entries.map((e) => ({
    requestId: e.requestId ?? "req-1",
    evaluator: e.evaluator ?? "deterministic",
    evaluatorVersion: e.evaluatorVersion,
    evaluation: { evaluatedAt: "2026-08-23T00:00:01.000Z", ...e.evaluation } as EvalEntry["evaluation"],
  }));
}

describe("RouteOutcome — delivery derivation (conservative)", () => {
  test.each<[string, Partial<RoutingLogEntry>, string]>([
    ["explicit error", { status: "error" }, "failure"],
    ["final truncation", { status: "success", finalTruncated: true }, "failure"],
    ["clean success", { status: "success", finalTruncated: false }, "success"],
    ["truncation repaired by continuation", { status: "success", truncated: true, finalTruncated: false }, "success"],
    ["rescue annotates, does not fail", { status: "success", finalTruncated: false, rescue: true, continuations: 2 }, "success"],
    ["success but final truncation unknown", { status: "success" }, "unknown"],
    ["pending status", { status: "pending", finalTruncated: false }, "unknown"],
    ["no telemetry at all", {}, "unknown"],
  ])("%s → %s", (_name, overrides, expected) => {
    const outcome = buildRouteOutcome(routing(overrides), []);
    expect(outcome?.delivery.status).toBe(expected);
    expect(outcome?.delivery.provenance).toBe("derived");
  });

  it("records the signals that were present as basis", () => {
    const outcome = buildRouteOutcome(
      routing({ status: "success", finalTruncated: false, truncated: true, rescue: true, continuations: 1 }),
      []
    );
    expect(outcome?.delivery.basis).toEqual(["status", "finalTruncated", "truncated", "rescue", "continuations"]);
  });

  it("empty basis when no delivery signals present", () => {
    const outcome = buildRouteOutcome(routing({}), []);
    expect(outcome?.delivery.basis).toEqual([]);
    expect(outcome?.delivery.status).toBe("unknown");
  });
});

describe("RouteOutcome — model identity provenance", () => {
  test.each([
    ["observed when resolvedModel present", { model: "A", resolvedModel: "A-001" }, "observed", "A", "A-001"],
    ["derived when only selected model present", { model: "A", resolvedModel: undefined }, "derived", "A", "A"],
    ["unavailable when neither present", { model: undefined, resolvedModel: undefined }, "unavailable", undefined, undefined],
  ])("%s", (_name, overrides, expectedProv, expectedSelected, expectedExecuted) => {
    const outcome = buildRouteOutcome(routing(overrides), []);
    expect(outcome?.modelIdentityProvenance).toBe(expectedProv);
    expect(outcome?.selectedModel).toBe(expectedSelected);
    expect(outcome?.executedModel).toBe(expectedExecuted);
  });
});

describe("RouteOutcome — safety derivation", () => {
  test.each<[string, NonNullable<EvalEntry["evaluation"]["safetyVerdict"]>, string]>([
    ["clean → pass", "clean", "pass"],
    ["critical → fail", "critical", "fail"],
    ["suspicious → unknown", "suspicious", "unknown"],
    ["high-risk → unknown", "high-risk", "unknown"],
  ])("%s", (_name, verdict, expected) => {
    const outcome = buildRouteOutcome(routing(), evals([{ evaluation: { safetyVerdict: verdict } }]));
    expect(outcome?.safety.status).toBe(expected);
  });

  it("fail dominates pass when evaluators disagree", () => {
    const outcome = buildRouteOutcome(
      routing(),
      evals([
        { evaluator: "deterministic", evaluatorVersion: "red-team-v1", evaluation: { safetyVerdict: "clean" } },
        { evaluator: "llm-judge", evaluatorVersion: "judge-v2", evaluation: { safetyVerdict: "critical" } },
      ])
    );
    expect(outcome?.safety.status).toBe("fail");
  });
});

describe("RouteOutcome — routing policy derivation", () => {
  test.each([
    ["correct", true, "correct"],
    ["incorrect", false, "incorrect"],
    ["unknown", undefined, "unknown"],
  ])("%s", (_name, routeCorrect, expected) => {
    const outcome = buildRouteOutcome(routing(), evals([{ evaluation: { routeCorrect } }]));
    expect(outcome?.routingPolicy.status).toBe(expected);
  });

  it("incorrect dominates correct", () => {
    const outcome = buildRouteOutcome(
      routing(),
      evals([
        { evaluation: { routeCorrect: true } },
        { evaluation: { routeCorrect: false } },
      ])
    );
    expect(outcome?.routingPolicy.status).toBe("incorrect");
  });
});

describe("RouteOutcome — quality (no pass contract in v1)", () => {
  it("reports unknown even when a qualityScore exists", () => {
    const outcome = buildRouteOutcome(
      routing(),
      evals([{ evaluator: "llm-judge", evaluatorVersion: "judge-v1", evaluation: { qualityScore: 42 } }])
    );
    expect(outcome?.quality.status).toBe("unknown");
    expect(outcome?.quality.evaluations).toEqual(["judge-v1"]);
  });

  it("no quality scores → empty evaluations", () => {
    const outcome = buildRouteOutcome(routing(), evals([{ evaluation: {} }]));
    expect(outcome?.quality.status).toBe("unknown");
    expect(outcome?.quality.evaluations).toEqual([]);
  });
});

describe("RouteOutcome — join contract", () => {
  it("returns null when routing has no requestId", () => {
    expect(buildRouteOutcome(routing({ requestId: undefined }), [])).toBeNull();
    expect(buildRouteOutcome(routing({ requestId: "  " }), [])).toBeNull();
  });

  it("execution fields passthrough", () => {
    const outcome = buildRouteOutcome(
      routing({
        rescue: true,
        truncated: true,
        finalTruncated: false,
        continuations: 2,
        totalChunks: 3,
        tokenCount: 500,
        actualTokens: 512,
        actualCost: 0.001,
      }),
      []
    );
    expect(outcome?.execution).toEqual({
      rescue: true,
      truncated: true,
      finalTruncated: false,
      continuations: 2,
      totalChunks: 3,
      tokenCount: 500,
      actualTokens: 512,
      actualCost: 0.001,
    });
  });

  it("schema version and correlation preserved", () => {
    const outcome = buildRouteOutcome(routing({ routeId: "adversarial-validation" }), []);
    expect(outcome?.schemaVersion).toBe(1);
    expect(outcome?.requestId).toBe("req-1");
    expect(outcome?.routeId).toBe("adversarial-validation");
    expect(outcome?.createdAt).toBe("2026-08-23T00:00:00.000Z");
  });

  it("outcome separation — dimensions stay independent", () => {
    const outcome = buildRouteOutcome(
      routing({ status: "success", finalTruncated: false }),
      evals([
        { evaluation: { routeCorrect: false, safetyVerdict: "clean", qualityScore: 90 } },
      ])
    );
    expect(outcome?.delivery.status).toBe("success");
    expect(outcome?.routingPolicy.status).toBe("incorrect");
    expect(outcome?.safety.status).toBe("pass");
    expect(outcome?.quality.status).toBe("unknown");
  });
});
