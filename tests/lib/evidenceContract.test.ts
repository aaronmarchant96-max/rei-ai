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
    expect(evidence.research.provenance).toBe("observed");
  });

  it("INVARIANT 4: Canonical research evidence is lossless with respect to executed telemetry", () => {
    const executedResearch = {
      invoked: true,
      status: "executed",
      provider: "exa",
      transport: "direct_api",
      reason: "external_source_required",
      queries: ["Query A", "Query B", "Query C"],
      resultCount: 5,
      sources: [
        { title: "Source A1", url: "https://a.org/1" },
        { title: "Source A2", url: "https://a.org/2" },
        { title: "Source B1", url: "https://b.org/1" },
        { title: "Source B2", url: "https://b.org/2" },
        { title: "Source C1", url: "https://c.org/1" },
      ],
      budget: {
        excerptCharacters: 1200,
        excerptTokensEstimated: 300,
        tokenAccounting: "estimated" as const,
        truncationApplied: false,
      },
      provenance: "observed" as const,
    };

    const evidence = buildRequestEvidence({
      routerDecision: { model: "gemini-3.6-flash" },
      research: executedResearch,
    });

    // Lossless order and shape invariants
    expect(evidence.research.queries).toEqual(["Query A", "Query B", "Query C"]);
    expect(evidence.research.sources.map(s => s.title)).toEqual([
      "Source A1", "Source A2", "Source B1", "Source B2", "Source C1"
    ]);
    expect(evidence.research.resultCount).toBe(5);
    expect(evidence.research.provider).toBe("exa");
    expect(evidence.research.transport).toBe("direct_api");
  });

  it("INVARIANT 5: State Invariant status === 'executed' <-> invoked === true", () => {
    // 1. Executed -> invoked: true
    const ev1 = buildRequestEvidence({
      research: { status: "executed", queries: ["query"] },
    });
    expect(ev1.research.status).toBe("executed");
    expect(ev1.research.invoked).toBe(true);

    // 2. Not required -> invoked: false
    const ev2 = buildRequestEvidence({
      research: { status: "not_required" },
    });
    expect(ev2.research.status).toBe("not_required");
    expect(ev2.research.invoked).toBe(false);

    // 3. Unavailable -> invoked: false
    const ev3 = buildRequestEvidence({
      research: { status: "unavailable" },
    });
    expect(ev3.research.status).toBe("unavailable");
    expect(ev3.research.invoked).toBe(false);
  });
});
