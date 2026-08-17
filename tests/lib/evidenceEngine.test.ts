import { buildRequestEvidence } from "../../src/lib/evidenceEngine";

describe("evidenceEngine.ts — Canonical Downstream Observer", () => {
  it("normalizes a full runtime trace with measured tokens and models savings accurately", () => {
    const evidence = buildRequestEvidence({
      requestId: "req-123",
      timestamp: "2026-08-17T09:00:00Z",
      routerDecision: {
        label: "The Engineer",
        model: "llama-3.1-8b-instant",
        domain: "coding",
        hingeScore: 0.42,
        reason: "Code architecture intent detected",
      },
      rawTrace: [
        { stageId: "red-team", stage: "Security Check", timestamp: "2026-08-17T09:00:01Z", passed: true, decision: "Clean" },
        { stageId: "intent-classification", stage: "Intent Classifier", timestamp: "2026-08-17T09:00:02Z", passed: true, decision: "Coding Domain", rule: "DAS-004" },
        { stageId: "model-selection", stage: "Model Selection", timestamp: "2026-08-17T09:00:03Z", passed: true, decision: "llama-3.1-8b-instant" }
      ],
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 200,
        total_tokens: 1200,
        cached_prompt_tokens: 850
      },
      responseText: "Here is the refactored function using strict type definitions.",
    });

    expect(evidence.requestId).toBe("req-123");
    expect(evidence.model).toBe("llama-3.1-8b-instant");
    expect(evidence.routeTrace).toHaveLength(3);
    expect(evidence.routeTrace[1].rule).toBe("DAS-004");
    expect(evidence.routeTrace[0].rule).toBeUndefined(); // Never invented

    // Telemetry & Caching
    expect(evidence.tokens.inputTokens).toBe(1000);
    expect(evidence.tokens.cachedInputTokens).toBe(850);
    expect(evidence.tokens.cacheHit).toBe(true);
    expect(evidence.tokens.cacheHitRatePct).toBe(85.0);
    expect(evidence.tokens.provenance).toBe("observed");

    // Economics
    expect(evidence.economics.observedCostUsd).toBeGreaterThan(0);
    expect(evidence.economics.observedProvenance).toBe("observed");
    expect(evidence.economics.counterfactual.provenance).toBe("modeled");
    expect(evidence.economics.counterfactual.costUsd).toBeGreaterThan(evidence.economics.observedCostUsd!);
    expect(evidence.economics.savings.provenance).toBe("derived");
    expect(evidence.economics.savings.percentage).toBeGreaterThan(50);

    // Rationale & Verification
    expect(evidence.routeRationale.complexityScore).toBe(0.42);
    expect(evidence.routeRationale.complexityProvenance).toBe("observed");
    expect(evidence.verificationSignals.cardoCompliant).toBe(true);
    expect(evidence.verificationSignals.slopDetected).toBe(false);
  });

  it("handles missing telemetry gracefully without substituting $0.00 or inventing data", () => {
    const evidence = buildRequestEvidence({
      routerDecision: null,
      rawTrace: null,
      usage: null,
      responseText: null,
    });

    expect(evidence.tokens.inputTokens).toBeNull();
    expect(evidence.tokens.provenance).toBe("unavailable");
    expect(evidence.economics.observedCostUsd).toBeNull();
    expect(evidence.economics.observedProvenance).toBe("unavailable");
    expect(evidence.economics.counterfactual.costUsd).toBeNull();
    expect(evidence.economics.counterfactual.provenance).toBe("unavailable");
    expect(evidence.economics.savings.amountUsd).toBeNull();
    expect(evidence.economics.savings.provenance).toBe("unavailable");

    expect(evidence.routeRationale.complexityScore).toBeNull();
    expect(evidence.routeRationale.complexityProvenance).toBe("unavailable");
    expect(evidence.verificationSignals.provenance).toBe("unavailable");
  });
});
