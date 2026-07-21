import { buildRouterDecision, getFingerprintCatalog, resolveRoutingModel } from "./nightShiftRouter.js";

describe("nightShiftRouter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });
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

  it("routes adversarial prompts to the red team surface scan path", () => {
    const decision = buildRouterDecision({ input: "Red-team this claim and prove it wrong", domain: "assistant" });

    expect(decision.id).toBe("red-team-surface");
    expect(decision.model).toBe("llama-3.1-8b-instant");
    expect(resolveRoutingModel(decision)).toBe("llama-3.1-8b-instant");
  });

  it("routes high-structure uncertainty prompts through a stricter reasoning gate", () => {
    const decision = buildRouterDecision({ input: "What am I missing? What would change my mind?", domain: "assistant" });

    expect(decision.id).toBe("structured-reasoning");
    expect(decision.qualityGate).toContain("challenge test");
    expect(decision.temperature).toBe(0.2);
  });

  it("uses a stored route preference when a prior pattern matches a generic request", () => {
    window.localStorage.setItem("night-shift-user-fingerprint", JSON.stringify(["genealogy-deep-dive", "genealogy-deep-dive", "genealogy-deep-dive"]));

    const decision = buildRouterDecision({ input: "Can you help me review this family record?", domain: "assistant" });

    expect(decision.id).toBe("genealogy-deep-dive");
  });

  it("falls back to the balanced reasoning profile for unclassified prompts", () => {
    const decision = buildRouterDecision({ input: "Help me think through a decision", domain: "assistant" });

    expect(decision.id).toBe("structured-reasoning");
    expect(decision.model).toBe("llama-3.3-70b-versatile");
  });

  describe("edge cases", () => {
    it("returns structured-reasoning for empty input", () => {
      const decision = buildRouterDecision({ input: "", domain: "assistant" });
      expect(decision.id).toBe("structured-reasoning");
    });

    it("handles missing input gracefully", () => {
      const decision = buildRouterDecision({});
      expect(decision.id).toBe("structured-reasoning");
    });

    it("handles null domain", () => {
      const decision = buildRouterDecision({ input: "hello", domain: null });
      expect(decision.id).toBe("simple-greeting");
    });

    it("routes genealogy by keyword even without domain match", () => {
      const decision = buildRouterDecision({ input: "burial record for john smith", domain: "assistant" });
      expect(decision.id).toBe("genealogy-deep-dive");
    });

    it("routes story by keyword", () => {
      const decision = buildRouterDecision({ input: "outline a character arc for a reluctant hero", domain: "assistant" });
      expect(decision.id).toBe("story-architect");
    });

    it("detects adversarial request via requiresAdversarial flag", () => {
      const decision = buildRouterDecision({ input: "tell me a story", domain: "assistant", requiresAdversarial: true });
      expect(decision.id).toBe("red-team-surface");
    });

    it("does not match substrings in getHighStructureSignals", () => {
      const decision = buildRouterDecision({ input: "uncertainty is not the same as uncertain", domain: "assistant" });
      expect(decision.id).toBe("structured-reasoning");
    });

    it("persists route history and retrieves stored preference", () => {
      window.localStorage.setItem("night-shift-user-fingerprint", JSON.stringify(["coding-hinge", "coding-hinge", "coding-hinge"]));
      const decision = buildRouterDecision({ input: "help me review this module", domain: "assistant" });
      expect(decision.id).toBe("coding-hinge");
    });

    it("respects domain override over keyword match", () => {
      const decision = buildRouterDecision({ input: "what is the best plot twist", domain: "story" });
      expect(decision.id).toBe("story-architect");
    });

    it("simple greeting does not route to Genealogy Deep Dive", () => {
      const decision = buildRouterDecision({ input: "System initialized. REI is live.", domain: "assistant" });
      expect(decision.id).not.toBe("genealogy-deep-dive");
    });
  });
});
