import { buildRouterDecision, getFingerprintCatalog, resolveRoutingModel } from "./nightShiftRouter.js";

describe("nightShiftRouter", () => {
  it("loads the fingerprint catalog", () => {
    const catalog = getFingerprintCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.find((entry) => entry.id === "structured-reasoning")).toBeDefined();
  });

  it("routes simple greetings to the cheap fast model", () => {
    const decision = buildRouterDecision({ input: "Hello there", domain: "assistant" });

    expect(decision.id).toBe("simple-greeting");
    expect(decision.model).toBe("llama-3.1-8b-instant");
    expect(decision.maxTokens).toBe(50);
  });

  it("routes coding requests through the hard-stop path", () => {
    const decision = buildRouterDecision({ input: "Please implement a React hook and add tests", domain: "coding" });

    expect(decision.id).toBe("coding-hinge");
    expect(decision.enforce).toBe("HARD_STOP");
    expect(decision.maxTokens).toBe(600);
  });

  it("routes genealogy prompts to the evidence-tier path", () => {
   const decision = buildRouterDecision({ input: "Did this ancestor marry in 1846 and which record is strongest?", domain: "assistant" });

   expect(decision.id).toBe("genealogy-deep-dive");
   expect(decision.enforce).toBe("EVIDENCE_TIERS");
  });

  it("routes evidence-heavy genealogy prompts using catalog keyword matches", () => {
   const decision = buildRouterDecision({ input: "Which burial record is strongest for this family line?", domain: "assistant" });

   expect(decision.id).toBe("genealogy-deep-dive");
   expect(decision.enforce).toBe("EVIDENCE_TIERS");
  });

  it("routes adversarial prompts to the premium validation path", () => {
    const decision = buildRouterDecision({ input: "Red-team this claim and prove it wrong", domain: "assistant" });

    expect(decision.id).toBe("adversarial-validation");
    expect(decision.model).toBe("gpt-4o");
    expect(resolveRoutingModel(decision)).toBe("gpt-4o");
  });

  it("falls back to the balanced reasoning profile for unclassified prompts", () => {
    const decision = buildRouterDecision({ input: "Help me think through a decision", domain: "assistant" });

    expect(decision.id).toBe("structured-reasoning");
    expect(decision.model).toBe("llama-3.3-70b-versatile");
  });
});
