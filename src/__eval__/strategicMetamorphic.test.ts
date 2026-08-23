import { evaluateStrategicRevision } from "../lib/strategic/strategicAnalysis";
import type { StrategicSituation } from "../lib/strategic/strategicTypes";

const base = (): StrategicSituation => ({
  schemaVersion: 1, detected: true,
  evidence: [{ id: "manager:quote", statement: "I am evaluated on quarterly cost reduction", sourceType: "user_statement", relation: "supports", claimRefs: ["manager-incentive"] }],
  players: [{ id: "manager", name: "Manager", role: "budget owner", power: "high", vetoCapability: false, exitCapability: false, objectives: [] }],
  rules: [], objectives: [], constraints: [], strategies: [], conflicts: [], alternatives: [],
  incentives: [{ actorId: "manager", direction: "toward", strength: "strong", claim: { id: "manager-incentive", statement: "Manager is rewarded for quarterly cost reduction", epistemicStatus: "stated", evidenceRefs: ["manager:quote"], confidence: "strong" } }],
  alignment: "unknown", falsificationConditions: [],
});
const clone = (value: StrategicSituation): StrategicSituation => JSON.parse(JSON.stringify(value));

test("strategic revisions preserve controls, degrade with evidence, and reconsider contradictions", () => {
  const control = base();
  expect(evaluateStrategicRevision(control, clone(control))).toEqual({ valid: true, violations: [] });

  const unsupported = base();
  unsupported.evidence = [];
  unsupported.incentives[0].claim.evidenceRefs = [];
  expect(evaluateStrategicRevision(control, unsupported).violations).toContain("manager-incentive: evidence weakened without epistemic or confidence degradation");

  const degraded = clone(unsupported);
  degraded.incentives[0].claim.epistemicStatus = "inferred";
  degraded.incentives[0].claim.confidence = "moderate";
  expect(evaluateStrategicRevision(control, degraded)).toEqual({ valid: true, violations: [] });

  const contradicted = base();
  contradicted.evidence.push({ id: "audit:opposition", statement: "Manager opposed the project", sourceType: "external_source", relation: "contradicts", claimRefs: ["manager-incentive"] });
  expect(evaluateStrategicRevision(control, contradicted).violations).toContain("manager-incentive: contradictory evidence added without reconsideration");

  contradicted.incentives[0].claim.confidence = "weak";
  expect(evaluateStrategicRevision(control, contradicted)).toEqual({ valid: true, violations: [] });
});
