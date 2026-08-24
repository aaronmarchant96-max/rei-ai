import { exportActivityJSON, projectActivity } from "./activityLedger";
import type { RoutingLogEntry } from "./routingLog";
import type { DecisionEntry } from "./decisionStore";
import type { EvalEntry } from "./evalLog";
import type { RoutePrediction } from "./routePredictionTypes";

function predictionFixture(overrides: Partial<RoutePrediction> = {}): RoutePrediction {
  return {
    schemaVersion: 1,
    id: "prediction:req-a:route-precedent-v1:delivery_failure",
    requestId: "req-a",
    predictorVersion: "route-precedent-v1",
    target: "delivery_failure",
    predictedAt: "2026-01-01T00:00:01Z",
    features: {
      schemaVersion: 1,
      routeId: "structured-reasoning",
      domain: "assistant",
      selectedModel: "model-A",
      hingeBand: "medium",
      structured: true,
      escalationExpected: false,
      adversarialBand: "clean",
      inputSizeBand: "small",
    },
    failureRisk: 0.122,
    riskInterval95: { low: 0.053, high: 0.255 },
    support: { total: 41, successes: 36, failures: 5 },
    evidenceQuality: "supported",
    precedentTier: "exact",
    corpusWindow: { before: "2026-01-01T00:00:01Z" },
    ...overrides,
  };
}

test("Activity projection preserves correlation, identity, ordering, retention truth, and redaction", () => {
  const routing: RoutingLogEntry[] = [
    { id: "routing:req-a", requestId: "req-a", routeId: "structured-reasoning", model: "m", status: "success", timestamp: "2026-01-01T00:00:00Z", inputPreview: "secret" },
    { id: "routing:req-b", requestId: "req-b", routeId: "structured-reasoning", timestamp: "2026-01-01T00:00:00Z" },
  ];
  const decisions: DecisionEntry[] = [{
    schemaVersion: 1,
    id: "decision:req-a",
    requestId: "req-a",
    sections: { Hinge: "private hinge" },
    domainLabel: "The Generalist",
    inputPreview: "secret",
    createdAt: "2026-01-01T00:00:01Z",
  }];
  const evaluations: EvalEntry[] = [{
    id: "eval:req-a:deterministic:red-team-v1:2026-01-01T00:00:02Z",
    requestId: "req-a",
    evaluator: "deterministic",
    evaluatorVersion: "red-team-v1",
    evaluation: { safetyVerdict: "clean", evaluatedAt: "2026-01-01T00:00:02Z" },
  }];

  const complete = projectActivity("req-a", { routing, decisions, evaluations });
  expect(complete.status).toBe("complete");
  expect(complete.sources).toEqual({ routing: "present", decision: "present", evaluation: "present" });
  expect(complete.events.map((event) => event.type)).toEqual([
    "routing.request_routed",
    "decision.recorded",
    "evaluation.recorded",
  ]);
  expect(complete.events.every((event) => event.requestId === "req-a")).toBe(true);
  expect(complete.events.map((event) => event.id)).toEqual([
    "routing:req-a:routing.request_routed",
    "decision:req-a:decision.recorded",
    "eval:req-a:deterministic:red-team-v1:2026-01-01T00:00:02Z:evaluation.recorded",
  ]);

  const partial = projectActivity("req-b", { routing, decisions, evaluations });
  expect(partial.status).toBe("partial");
  expect(partial.sources).toEqual({ routing: "present", decision: "missing", evaluation: "missing" });

  const orphaned = projectActivity("req-a", { routing: [], decisions, evaluations });
  expect(orphaned.status).toBe("orphaned");

  const legacyRouting = [{ requestId: "req-legacy", routeId: "simple-greeting", timestamp: "2026-01-01T00:00:00Z" }];
  const legacy = projectActivity("req-legacy", { routing: legacyRouting, decisions: [], evaluations: [] });
  expect(legacy.status).toBe("partial");
  expect(legacy.sources.routing).toBe("legacy");
  expect(projectActivity("req-legacy", { routing: [...legacyRouting].reverse(), decisions: [], evaluations: [] }).events[0].id)
    .toBe(legacy.events[0].id);

  const redacted = JSON.parse(exportActivityJSON([complete]));
  expect(redacted.projections[0].events.every((event: { details?: unknown }) => event.details === undefined)).toBe(true);
  expect(JSON.stringify(redacted)).not.toContain("private hinge");
  expect(JSON.stringify(redacted)).not.toContain("secret");
});

test("prediction and outcome events project as optional additive activity", () => {
  const routing: RoutingLogEntry[] = [{
    id: "routing:req-a",
    requestId: "req-a",
    routeId: "structured-reasoning",
    model: "model-A",
    resolvedModel: "model-A-001",
    status: "success",
    finalTruncated: false,
    timestamp: "2026-01-01T00:00:00Z",
    outcomeObservedAt: "2026-01-01T00:00:05Z",
  }];

  const projected = projectActivity("req-a", {
    routing,
    decisions: [],
    evaluations: [],
    predictions: [predictionFixture()],
  });

  const predictionEvents = projected.events.filter((e) => e.type === "prediction.shadow_created");
  const outcomeEvents = projected.events.filter((e) => e.type === "routing.outcome_observed");
  expect(predictionEvents).toHaveLength(1);
  expect(outcomeEvents).toHaveLength(1);

  const predictionEvent = predictionEvents[0];
  expect(predictionEvent.timestamp).toBe("2026-01-01T00:00:01Z");
  expect(predictionEvent.category).toBe("prediction");
  expect(predictionEvent.sourceStore).toBe("prediction");
  expect(predictionEvent.id).toBe("prediction:req-a:route-precedent-v1:delivery_failure:prediction.shadow_created");
  expect(predictionEvent.details).toMatchObject({
    failureRisk: 0.122,
    support: 41,
    evidenceQuality: "supported",
    precedentTier: "exact",
    riskInterval95: { low: 0.053, high: 0.255 },
  });

  const outcomeEvent = outcomeEvents[0];
  expect(outcomeEvent.timestamp).toBe("2026-01-01T00:00:05Z");
  expect(outcomeEvent.sourceStore).toBe("routing");

  // Normal ordering: routed < prediction < outcome.
  const types = projected.events.map((e) => e.type);
  expect(types.indexOf("routing.request_routed")).toBeLessThan(types.indexOf("prediction.shadow_created"));
  expect(types.indexOf("prediction.shadow_created")).toBeLessThan(types.indexOf("routing.outcome_observed"));
});

test("null-risk prediction never reads as 0% and absent prediction does not downgrade completeness", () => {
  const routing: RoutingLogEntry[] = [{
    id: "routing:req-a",
    requestId: "req-a",
    routeId: "structured-reasoning",
    status: "success",
    timestamp: "2026-01-01T00:00:00Z",
    outcomeObservedAt: "2026-01-01T00:00:05Z",
  }];
  const nullPred = predictionFixture({
    failureRisk: null,
    riskInterval95: null,
    support: { total: 0, successes: 0, failures: 0 },
    evidenceQuality: "unavailable",
    precedentTier: "none",
  });

  const without = projectActivity("req-a", { routing, decisions: [], evaluations: [] });
  const withPred = projectActivity("req-a", { routing, decisions: [], evaluations: [], predictions: [nullPred] });

  // Absent prediction must not downgrade completeness or sources.
  expect(withPred.status).toBe(without.status);
  expect(withPred.sources).toEqual(without.sources);

  const ev = withPred.events.find((e) => e.type === "prediction.shadow_created");
  expect(ev).toBeDefined();
  expect(ev!.details!.failureRisk).toBeNull();
  expect(ev!.summary).not.toMatch(/0%/);
  expect(JSON.stringify(ev)).not.toContain("0%");
});

test("prediction is isolated by requestId and outcome is never fabricated", () => {
  const routing: RoutingLogEntry[] = [
    { id: "routing:req-a", requestId: "req-a", routeId: "structured-reasoning", status: "success", timestamp: "2026-01-01T00:00:00Z", outcomeObservedAt: "2026-01-01T00:00:05Z" },
    { id: "routing:req-b", requestId: "req-b", routeId: "structured-reasoning", status: "success", timestamp: "2026-01-01T00:00:10Z" },
  ];

  // req-b has no outcomeObservedAt → no fabricated outcome event.
  const projectionB = projectActivity("req-b", {
    routing,
    decisions: [],
    evaluations: [],
    predictions: [predictionFixture()], // belongs to req-a
  });
  expect(projectionB.events.filter((e) => e.type === "routing.outcome_observed")).toHaveLength(0);
  expect(projectionB.events.filter((e) => e.category === "prediction")).toHaveLength(0);
});

test("prediction projection is deterministic regardless of source-array order", () => {
  const routing: RoutingLogEntry[] = [{
    id: "routing:req-a",
    requestId: "req-a",
    routeId: "structured-reasoning",
    status: "success",
    timestamp: "2026-01-01T00:00:00Z",
    outcomeObservedAt: "2026-01-01T00:00:05Z",
  }];
  const preds = [predictionFixture()];
  const a = projectActivity("req-a", { routing, decisions: [], evaluations: [], predictions: preds });
  const b = projectActivity("req-a", { routing: [...routing].reverse(), decisions: [], evaluations: [], predictions: [...preds].reverse() });
  expect(a.events).toEqual(b.events);
});
