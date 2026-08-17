import { buildRequestEvidence } from "../../src/lib/evidenceEngine";

describe("Evidence Contract Invariants (Zero Theater)", () => {
  it("INVARIANT 1: Never substitutes $0.00 for absent cost telemetry", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "llama-3.3-70b-versatile" },
      usage: null, // No token telemetry
    });

    expect(evidence.economics.observedCostUsd).toBeNull();
    expect(evidence.economics.observedProvenance).toBe("unavailable");
    expect(evidence.economics.counterfactual.costUsd).toBeNull();
    expect(evidence.economics.counterfactual.provenance).toBe("unavailable");
    expect(evidence.economics.savings.percentage).toBeNull();
    expect(evidence.economics.savings.provenance).toBe("unavailable");
  });

  it("INVARIANT 2: Preserves recorded trace ordering and never invents missing rules", () => {
    const rawTrace = [
      { stageId: "red-team", stage: "Red Team Guard", timestamp: "T1", passed: true, decision: "Clean" },
      { stageId: "intent-classification", stage: "Intent Classifier", timestamp: "T2", passed: true, decision: "Archivist", rule: "RULE-ARCH-1" },
      { stageId: "dispatch", stage: "Model Dispatch", timestamp: "T3", passed: true, decision: "llama-3.1-8b-instant" }
    ];

    const evidence = buildRequestEvidence({
      rawTrace,
      routerDecision: { model: "llama-3.1-8b-instant" }
    });

    expect(evidence.routeTrace).toHaveLength(3);
    expect(evidence.routeTrace.map(s => s.stageId)).toEqual(["red-team", "intent-classification", "dispatch"]);
    expect(evidence.routeTrace[0].rule).toBeUndefined(); // Must NOT invent a rule for red-team
    expect(evidence.routeTrace[1].rule).toBe("RULE-ARCH-1");
    expect(evidence.routeTrace[2].rule).toBeUndefined(); // Must NOT invent a rule for dispatch
  });

  it("INVARIANT 3: Epistemic provenance is explicitly demarcated on all field groups", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "llama-3.1-8b-instant", hingeScore: 0.8 },
      usage: { prompt_tokens: 500, completion_tokens: 100, cached_prompt_tokens: 400 },
      responseText: "Clean factual answer."
    });

    expect(evidence.tokens.provenance).toBe("observed");
    expect(evidence.economics.observedProvenance).toBe("observed");
    expect(evidence.economics.counterfactual.provenance).toBe("modeled");
    expect(evidence.economics.savings.provenance).toBe("derived");
    expect(evidence.routeRationale.complexityProvenance).toBe("observed");
    expect(evidence.verificationSignals.provenance).toBe("observed");
  });
});
