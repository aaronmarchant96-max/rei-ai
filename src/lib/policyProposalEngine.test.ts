import { generateProposals } from "./policyProposalEngine";
import type { PolicyProposal } from "./policyProposalEngine";
import type { EvalEntry } from "./evalLog";
import type { RoutingLogEntry } from "./routingLog";
import type { ClaimReport } from "./claimGateway";

function evalEntry(overrides: Partial<EvalEntry> & { requestId: string }): EvalEntry {
  return {
    domain: "assistant",
    routeId: "structured-reasoning",
    model: "deepseek-v4-flash",
    evaluator: "deterministic",
    evaluatorVersion: "red-team-v1",
    evaluation: { evaluatedAt: "2026-08-11T00:00:00Z" },
    ...overrides,
  };
}

function logEntry(overrides: Partial<RoutingLogEntry> & { requestId: string }): RoutingLogEntry {
  return {
    domain: "assistant",
    routeId: "structured-reasoning",
    model: "llama-3.3-70b-versatile",
    estimatedCost: 0.0011,
    premiumCost: 0.004,
    hingeScore: 0.1,
    timestamp: "2026-08-11T00:00:00Z",
    ...overrides,
  };
}

function claimReport(overrides: Partial<ClaimReport>): ClaimReport {
  return {
    claimId: "test-claim",
    title: "test claim ≥ 80%",
    category: "dashboard",
    pass: true,
    severity: "info",
    computed: 100,
    reason: "within threshold",
    source: "src/lib/test.ts",
    ...overrides,
  };
}

describe("policyProposalEngine — positive signals", () => {
  it("proposes a missed escalation when the scanner escalated but the route was wrong", () => {
    const evals = [
      evalEntry({
        requestId: "req-miss",
        routeId: "structured-reasoning",
        evaluation: {
          qualityScore: 86,
          routeExpected: true,
          routeCorrect: false,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    const props = generateProposals(evals, [], []);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("missed-escalation");
    expect(props[0].id).toBe("missed-escalation:req-miss");
    expect(props[0].requestIds).toEqual(["req-miss"]);
    expect(props[0].evidence).toContain("86/100");
  });

  it("proposes a false-positive escalation on a borderline escalation with a clean response", () => {
    const evals = [
      evalEntry({
        requestId: "req-fp",
        routeId: "adversarial-validation",
        evaluation: {
          qualityScore: 63,
          safetyVerdict: "clean",
          routeExpected: true,
          routeCorrect: true,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    const props = generateProposals(evals, [], []);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("false-positive-escalation");
    expect(props[0].id).toBe("false-positive-escalation:req-fp");
  });

  it("proposes a cheap-route opportunity only with clean + correct + untruncated outcome", () => {
    const evals = [
      evalEntry({
        requestId: "req-cheap",
        routeId: "structured-reasoning",
        evaluation: {
          safetyVerdict: "clean",
          routeExpected: true,
          routeCorrect: true,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    const logs = [
      logEntry({
        requestId: "req-cheap",
        routeId: "structured-reasoning",
        hingeScore: 0.12,
        estimatedCost: 0.0011,
        premiumCost: 0.004,
        truncated: false,
        rescue: false,
      }),
    ];
    const props = generateProposals(evals, logs, []);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("cheap-route-opportunity");
    expect(props[0].id).toBe("cheap-route-opportunity:req-cheap");
  });

  it("proposes claim drift from the claims gate's own failing report", () => {
    const claims = [
      claimReport({
        claimId: "cost-savings-ceiling",
        pass: false,
        severity: "error",
        computed: 74,
        reason: "74% savings — collapsed below 80%",
      }),
    ];
    const props = generateProposals([], [], claims);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("claim-drift");
    expect(props[0].id).toBe("claim-drift:cost-savings-ceiling");
    expect(props[0].evidence).toContain("claims gate's own verdict");
  });
});

describe("policyProposalEngine — negative controls (absence of evidence is not evidence)", () => {
  it("produces no proposals from empty evidence", () => {
    expect(generateProposals([], [], [])).toEqual([]);
  });

  it("does not propose a missed escalation when the router obeyed correctly", () => {
    const evals = [
      evalEntry({
        requestId: "req-ok",
        routeId: "adversarial-validation",
        evaluation: {
          qualityScore: 90,
          safetyVerdict: "high-risk",
          routeExpected: true,
          routeCorrect: true,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    expect(generateProposals(evals, [], [])).toEqual([]);
  });

  it("does not propose a false positive on a confident escalation (score >= 80)", () => {
    const evals = [
      evalEntry({
        requestId: "req-confident",
        routeId: "adversarial-validation",
        evaluation: {
          qualityScore: 92,
          safetyVerdict: "clean",
          routeExpected: true,
          routeCorrect: true,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    expect(generateProposals(evals, [], [])).toEqual([]);
  });

  it("does not propose a cheap-route opportunity when the outcome was NOT clean", () => {
    const evals = [
      evalEntry({
        requestId: "req-risk",
        routeId: "structured-reasoning",
        evaluation: {
          safetyVerdict: "high-risk",
          routeExpected: false,
          routeCorrect: true,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    const logs = [
      logEntry({
        requestId: "req-risk",
        routeId: "structured-reasoning",
        hingeScore: 0.1,
        truncated: false,
        rescue: false,
      }),
    ];
    expect(generateProposals(evals, logs, [])).toEqual([]);
  });

  it("does not propose a cheap-route opportunity on a high-complexity request", () => {
    const evals = [
      evalEntry({
        requestId: "req-complex",
        routeId: "structured-reasoning",
        evaluation: {
          safetyVerdict: "clean",
          routeExpected: true,
          routeCorrect: true,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    const logs = [
      logEntry({
        requestId: "req-complex",
        routeId: "structured-reasoning",
        hingeScore: 0.7,
        truncated: false,
        rescue: false,
      }),
    ];
    expect(generateProposals(evals, logs, [])).toEqual([]);
  });

  it("does not propose claim drift for a passing or info-severity claim", () => {
    const claims = [
      claimReport({ pass: true, severity: "info", computed: 95, reason: "within threshold" }),
      claimReport({ pass: false, severity: "info", computed: null, reason: "no data yet" }),
    ];
    expect(generateProposals([], [], claims)).toEqual([]);
  });

  it("emits proposals sorted deterministically by signal then id", () => {
    const evals = [
      evalEntry({
        requestId: "req-b",
        evaluation: {
          qualityScore: 86,
          routeExpected: true,
          routeCorrect: false,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
      evalEntry({
        requestId: "req-a",
        evaluation: {
          qualityScore: 86,
          routeExpected: true,
          routeCorrect: false,
          evaluatedAt: "2026-08-11T00:00:00Z",
        },
      }),
    ];
    const props = generateProposals(evals, [], []);
    expect(props.map((p) => p.id)).toEqual(["missed-escalation:req-a", "missed-escalation:req-b"]);
  });

  it("missing qualityScore does not trigger a missed-escalation proposal", () => {
    const evals = [
      evalEntry({
        requestId: "req-noscore",
        evaluation: { routeExpected: true, routeCorrect: false, evaluatedAt: "2026-08-11T00:00:00Z" },
      }),
    ];
    expect(generateProposals(evals, [], [])).toEqual([]);
  });
});
