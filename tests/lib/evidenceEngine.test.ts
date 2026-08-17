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
    expect(evidence.research.invoked).toBe(false);
    expect(evidence.research.status).toBe("not_required");
    expect(evidence.research.provenance).toBe("observed");
  });

  it("normalizes executed research telemetry with observed provider and lossless source lists", () => {
    const evidence = buildRequestEvidence({
      requestId: "req-research-01",
      routerDecision: { label: "The Storyteller", model: "openai/gpt-oss-120b", domain: "story" },
      research: {
        invoked: true,
        status: "executed",
        provider: "exa",
        transport: "direct_api",
        reason: "domain_grounding_required",
        queries: ["Isaac Cline Galveston hurricane 1900"],
        resultCount: 2,
        sources: [
          { title: "Galveston Storm 1900", url: "https://example.org/galveston", highlights: "Cline hitched a horse..." },
          { title: "NOAA Archives", url: "https://noaa.gov/1900", highlights: "Category 4 storm surge..." },
        ],
        budget: {
          excerptCharacters: 58,
          excerptTokensEstimated: 15,
          tokenAccounting: "estimated",
          truncationApplied: false,
        },
        provenance: "observed",
      },
    });

    expect(evidence.research.invoked).toBe(true);
    expect(evidence.research.status).toBe("executed");
    expect(evidence.research.provider).toBe("exa");
    expect(evidence.research.transport).toBe("direct_api");
    expect(evidence.research.reason).toBe("domain_grounding_required");
    expect(evidence.research.queries).toEqual(["Isaac Cline Galveston hurricane 1900"]);
    expect(evidence.research.resultCount).toBe(2);
    expect(evidence.research.sources).toHaveLength(2);
    expect(evidence.research.sources[0].url).toBe("https://example.org/galveston");
    expect(evidence.research.budget.excerptCharacters).toBe(58);
    expect(evidence.research.budget.tokenAccounting).toBe("estimated");
    expect(evidence.research.provenance).toBe("observed");
  });

  it("preserves lossless execution order for multi-step autonomous research", () => {
    const evidence = buildRequestEvidence({
      requestId: "req-multi-tool-02",
      routerDecision: { label: "The Engineer", model: "gemini-3.6-flash", domain: "coding" },
      research: {
        invoked: true,
        status: "executed",
        provider: "exa",
        reason: "url_verification_required",
        queries: [
          "React 19 useActionState migration",
          "Zod v4 breaking changes",
          "https://github.com/facebook/react/releases/tag/v19.0.0"
        ],
        resultCount: 4,
        sources: [
          { title: "React 19 Release", url: "https://react.dev/blog/2024/12/05/react-19", highlights: "useActionState replaced useFormState" },
          { title: "React Migration Guide", url: "https://react.dev/blog/2024/04/25/react-19-upgrade-guide", highlights: "Refactoring steps" },
          { title: "Zod v4 Alpha Docs", url: "https://zod.dev/v4", highlights: "New schema parser" },
          { title: "github.com", url: "https://github.com/facebook/react/releases/tag/v19.0.0", snippet: "Release tag notes" },
        ],
      },
    });

    // Invariant: exact chronological query order preserved
    expect(evidence.research.queries).toEqual([
      "React 19 useActionState migration",
      "Zod v4 breaking changes",
      "https://github.com/facebook/react/releases/tag/v19.0.0"
    ]);

    // Invariant: exact source execution order preserved (lossless)
    expect(evidence.research.sources).toHaveLength(4);
    expect(evidence.research.sources[0].title).toBe("React 19 Release");
    expect(evidence.research.sources[1].title).toBe("React Migration Guide");
    expect(evidence.research.sources[2].title).toBe("Zod v4 Alpha Docs");
    expect(evidence.research.sources[3].url).toBe("https://github.com/facebook/react/releases/tag/v19.0.0");
    expect(evidence.research.resultCount).toBe(4);
  });

  it("strictly distinguishes not_required (observed) from unavailable (missing telemetry)", () => {
    // 1. Not required (observed decision)
    const notRequiredEvidence = buildRequestEvidence({
      routerDecision: { label: "Simple Greeting", model: "openai/gpt-oss-20b" },
      research: { status: "not_required" },
    });
    expect(notRequiredEvidence.research.invoked).toBe(false);
    expect(notRequiredEvidence.research.status).toBe("not_required");
    expect(notRequiredEvidence.research.provenance).toBe("observed");
    expect(notRequiredEvidence.research.budget.excerptCharacters).toBe(0);

    // 2. Unavailable (missing/corrupted telemetry)
    const unavailableEvidence = buildRequestEvidence({
      routerDecision: { label: "Corrupted Trace" },
      research: { status: "unavailable" },
    });
    expect(unavailableEvidence.research.invoked).toBe(false);
    expect(unavailableEvidence.research.status).toBe("unavailable");
    expect(unavailableEvidence.research.provenance).toBe("unavailable");
    expect(unavailableEvidence.research.budget.excerptTokensEstimated).toBeNull();
  });
});
