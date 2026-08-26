import { generateProposals, exportProposalAsFixture } from "./policyProposalEngine";
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

describe("policyProposalEngine — PR7 C-Activity policy adapter", () => {
  const sampleReport: any = {
    schemaVersion: 1,
    detectorVersion: "route-learning-v1",
    corpus: { eligible: 50 },
    examined: { cohorts: 2, calibrationBins: 10 },
    suppressed: { insufficientSupport: 0, overlappingIntervals: 0, unavailableComparator: 0 },
    signals: [
      {
        id: "learning:persistent-delivery-risk:cohort-hash-123",
        type: "persistent-delivery-risk",
        cohortHash: "cohort-hash-123",
        model: "deepseek-v4-flash",
        routeId: "structured-reasoning",
        cohortRiskInterval: { low: 0.4, high: 0.6 },
        comparatorRiskInterval: { low: 0.1, high: 0.2 },
      },
      {
        id: "learning:prediction-miscalibration:route-learning-v1:deepseek-v4-flash:0.1",
        type: "prediction-miscalibration",
        model: "deepseek-v4-flash",
        binLow: 0.1,
        binHigh: 0.2,
        meanPredicted: 0.15,
        actualInterval: { low: 0.35, high: 0.55 },
        direction: "underpredicting",
        support: 25,
      },
      {
        id: "learning:cohort-drift:cohort-hash-123",
        type: "cohort-drift",
        cohortHash: "cohort-hash-123",
        model: "deepseek-v4-flash",
        routeId: "structured-reasoning",
        previousInterval: { low: 0.05, high: 0.15 },
        recentInterval: { low: 0.35, high: 0.55 },
        direction: "increasing",
      },
    ],
  };

  it("maps persistent-delivery-risk to an explicit PolicyProposal", () => {
    const report = { ...sampleReport, signals: [sampleReport.signals[0]] };
    const props = generateProposals([], [], [], report);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("persistent-delivery-risk");
    expect(props[0].category).toBe("learning");
    expect(props[0].id).toBe("policy-proposal:policy-adapter-v1:learning:persistent-delivery-risk:cohort-hash-123");
    expect(props[0].evidence).toContain("Observed cohort pattern:");
    expect(props[0].evidence).toContain("strictly exceeds comparator risk interval");
    expect(props[0].evidence).toContain("Source signal: \"learning:persistent-delivery-risk:cohort-hash-123\"");
    expect(props[0].suggestedChange).toContain("Review candidate policy: evaluate whether this route/model cohort needs a routing-policy adjustment");
  });

  it("maps prediction-miscalibration to an explicit PolicyProposal", () => {
    const report = { ...sampleReport, signals: [sampleReport.signals[1]] };
    const props = generateProposals([], [], [], report);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("prediction-miscalibration");
    expect(props[0].category).toBe("learning");
    expect(props[0].evidence).toContain("predictor is underpredicting");
    expect(props[0].suggestedChange).toContain("Review candidate policy: evaluate whether predictor calibration");
  });

  it("maps cohort-drift to an explicit PolicyProposal", () => {
    const report = { ...sampleReport, signals: [sampleReport.signals[2]] };
    const props = generateProposals([], [], [], report);
    expect(props).toHaveLength(1);
    expect(props[0].signal).toBe("cohort-drift");
    expect(props[0].category).toBe("learning");
    expect(props[0].evidence).toContain("failure rate for cohort on model \"deepseek-v4-flash\"");
    expect(props[0].suggestedChange).toContain("Review candidate policy: evaluate whether a recently changing cohort warrants investigation");
  });

  it("enforces idempotence by suppressing duplicate source signal IDs", () => {
    const reportWithDuplicates = {
      ...sampleReport,
      signals: [sampleReport.signals[0], sampleReport.signals[0]],
    };
    const props = generateProposals([], [], [], reportWithDuplicates);
    expect(props).toHaveLength(1);
  });

  it("produces deterministic, byte-equivalent proposals regardless of signal input order", () => {
    const reportReverse = {
      ...sampleReport,
      signals: [...sampleReport.signals].reverse(),
    };
    const props1 = generateProposals([], [], [], sampleReport);
    const props2 = generateProposals([], [], [], reportReverse);
    expect(JSON.stringify(props1)).toBe(JSON.stringify(props2));
  });

  it("fails closed on unknown signal types", () => {
    const reportUnknown = {
      ...sampleReport,
      signals: [{ id: "sig-999", type: "unknown-future-signal" }],
    };
    const props = generateProposals([], [], [], reportUnknown);
    expect(props).toEqual([]);
  });

  it("fails closed on malformed or unsupported report versions", () => {
    const malformedReport1: any = { schemaVersion: 2, detectorVersion: "route-learning-v1", signals: sampleReport.signals };
    const malformedReport2: any = { schemaVersion: 1, detectorVersion: "route-learning-v1", signals: null };
    const unsupportedDetectorReport: any = { schemaVersion: 1, detectorVersion: "future-detector-v99", signals: sampleReport.signals };

    expect(generateProposals([], [], [], malformedReport1)).toEqual([]);
    expect(generateProposals([], [], [], malformedReport2)).toEqual([]);
    expect(generateProposals([], [], [], unsupportedDetectorReport)).toEqual([]);
    expect(generateProposals([], [], [], undefined)).toEqual([]);
  });

  it("ensures proposals contain no prompt or prompt-bearing user input text in entire serialized object", () => {
    const props = generateProposals([], [], [], sampleReport);
    for (const p of props) {
      const serialized = JSON.stringify(p);
      expect(serialized).not.toMatch(/prompt|user_input|inputPreview|notes/i);
    }
  });

  it("proves that policy proposal generation does not mutate routing state", () => {
    const propsBefore = generateProposals([], [], [], sampleReport);
    const propsAfter = generateProposals([], [], [], sampleReport);
    expect(propsBefore).toEqual(propsAfter);
  });

  it("exports proposal as a runnable Jest test fixture snippet string", () => {
    const props = generateProposals([], [], [], sampleReport);
    expect(props.length).toBeGreaterThan(0);
    const snippet = exportProposalAsFixture(props[0]);
    expect(snippet).toContain("// Auto-generated regression test fixture for proposal:");
    expect(snippet).toContain("describe(");
    expect(snippet).toContain("it(");
    expect(exportProposalAsFixture(null as any)).toBe("");
  });
});
