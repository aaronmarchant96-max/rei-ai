import { exportActivityJSON, projectActivity } from "./activityLedger";
import type { RoutingLogEntry } from "./routingLog";
import type { DecisionEntry } from "./decisionStore";
import type { EvalEntry } from "./evalLog";

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
