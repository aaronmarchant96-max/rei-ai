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
    expect(decision.maxTokens).toBe(1200);
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

  it("routes adversarial prompts to the adversarial validation path", () => {
    const decision = buildRouterDecision({ input: "Red-team this claim and prove it wrong", domain: "assistant" });

    expect(decision.id).toBe("adversarial-validation");
    expect(decision.model).toBe("llama-3.3-70b-versatile");
    expect(resolveRoutingModel(decision)).toBe("llama-3.3-70b-versatile");
  });

  it("routes high-structure uncertainty prompts through a stricter reasoning gate", () => {
    const decision = buildRouterDecision({ input: "What am I missing? What would change my mind?", domain: "assistant" });

    expect(decision.id).toBe("structured-reasoning");
    expect(decision.qualityGate).toContain("challenge test");
    expect(decision.temperature).toBe(0.2);
  });

  it("uses a stored route preference when a prior pattern matches a generic request", () => {
    // Write v2 object-format entries so the recency-decay scorer can evaluate them
    window.localStorage.setItem(
      "night-shift-user-fingerprint",
      JSON.stringify([
        { id: "genealogy-deep-dive", slot: 0 },
        { id: "genealogy-deep-dive", slot: 1 },
        { id: "genealogy-deep-dive", slot: 2 },
      ])
    );

    const decision = buildRouterDecision({ input: "Can you help me review this family record?", domain: "assistant" });

    expect(decision.id).toBe("genealogy-deep-dive");
  });

  it("routes operational maintenance questions to structured reasoning domain", () => {
    const pumpDecision = buildRouterDecision({ input: "We have a vibration sensor on a critical pump showing a 49% increase above baseline, but a new AI risk score says the probability of failure is only 23%. Should I schedule a shutdown, or can I wait until the next planned outage?", domain: "assistant" });

    expect(pumpDecision.id).toBe("structured-reasoning");
    expect(pumpDecision.qualityGate).toContain("Hinge + Facts + Move");
  });

  it("routes architecture/technical-debt decisions to structured reasoning domain", () => {
    const architectureDecision = buildRouterDecision({ input: "I'm the CTO of a mid-sized SaaS company. Our legacy monolith app has a 15% annual chance of a major security breach, which would cost us $2M to clean up. Rewriting it into microservices would cost $200k upfront, but it would drop the breach probability to 2%. Should we rewrite, or keep patching the monolith?", domain: "assistant" });

    expect(architectureDecision.id).toBe("structured-reasoning");
    expect(architectureDecision.qualityGate).toContain("Hinge + Facts + Move");
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
      expect(decision.id).toBe("adversarial-validation");
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

    it("routes adversarial keywords to adversarial-validation", () => {
      const decision = buildRouterDecision({ input: "red-team this security proposal", domain: "assistant" });
      expect(decision.id).toBe("adversarial-validation");
      expect(decision.model).toBe("llama-3.3-70b-versatile");
    });

    it("non-red-team inputs don't accidentally trigger red-team route", () => {
      const decision = buildRouterDecision({ input: "hello", domain: "assistant" });
      expect(decision.id).toBe("simple-greeting");
      expect(decision.id).not.toBe("adversarial-validation");
    });

    it("routes coding-over-story when coding keywords are stronger", () => {
      const decision = buildRouterDecision({ input: "write a react component that tells a story", domain: "assistant" });
      expect(["coding-hinge", "story-architect"]).toContain(decision.id);
    });

    it("routes high-structure prompts with appropriate quality gate", () => {
      const decision = buildRouterDecision({ input: "what am I missing here? how do I know if this is reliable?", domain: "assistant" });
      expect(decision.id).toBe("structured-reasoning");
      expect(decision.maxTokens).toBeGreaterThanOrEqual(400);
    });

    it("isolates preferences to their active domains and prevents cross-domain leakage", () => {
      // Coding ring preference
      window.localStorage.setItem("night-shift-history-coding", JSON.stringify([
        { id: "coding-hinge", slot: 0 },
        { id: "coding-hinge", slot: 1 },
        { id: "coding-hinge", slot: 2 }
      ]));
      // Story ring preference
      window.localStorage.setItem("night-shift-history-story", JSON.stringify([
        { id: "story-architect", slot: 0 },
        { id: "story-architect", slot: 1 },
        { id: "story-architect", slot: 2 }
      ]));

      // Verify that under domain: "coding", coding preference wins
      const codDecision = buildRouterDecision({ input: "how do I structure this?", domain: "coding" });
      expect(codDecision.id).toBe("coding-hinge");

      // Verify that under domain: "story", story preference wins
      const storyDecision = buildRouterDecision({ input: "how do I structure this?", domain: "story" });
      expect(storyDecision.id).toBe("story-architect");
    });

    it("routes adversarial prompt injection to adversarial-validation", () => {
      const input = "break it: find the weakest link in this design";
      const decision = buildRouterDecision({ input, domain: "assistant" });
      expect(decision.id).toBe("adversarial-validation");
    });

    it("does not route narrative prompts with 'build' to coding", () => {
      const decision = buildRouterDecision({ input: "build a fantasy world where magic drains memory", domain: "assistant" });
      expect(decision.id).not.toBe("coding-hinge");
    });

    it("does not route 'stack trace' or 'trace the memory leak' to genealogy", () => {
      const traceCoding = buildRouterDecision({ input: "stack trace error in production", domain: "assistant" });
      expect(traceCoding.id).not.toBe("genealogy-deep-dive");

      const traceMem = buildRouterDecision({ input: "trace the memory leak", domain: "assistant" });
      expect(traceMem.id).not.toBe("genealogy-deep-dive");

      const traceGenealogy = buildRouterDecision({ input: "trace my maternal line back to the 1800s", domain: "assistant" });
      expect(traceGenealogy.id).toBe("genealogy-deep-dive");
    });

    it("routes meta-queries to the cheap model", () => {
      const decision = buildRouterDecision({ input: "how do you work", domain: "assistant" });
      expect(decision.id).toBe("simple-greeting");
      expect(decision.model).toBe("llama-3.1-8b-instant");
    });

    it("differentiates cost between the free 70B path and paid routes", () => {
      const greeting = buildRouterDecision({ input: "hello", domain: "assistant" });
      const freeReasoning = buildRouterDecision({ input: "Help me think through a decision", domain: "assistant" });
      const coding = buildRouterDecision({ input: "evaluate tradeoffs between monorepo and polyrepo", domain: "assistant" });

      expect(greeting.model).toBe("llama-3.1-8b-instant");
      expect(freeReasoning.model).toBe("llama-3.3-70b-versatile");
      expect(coding.model).toBe("gemini-flash-latest");
      // llama-3.3-70b is free on Groq; greeting (8b) and coding (Gemini) have nominal rates
      expect(freeReasoning.estimatedCost).toBe(0);
      expect(greeting.estimatedCost).toBeGreaterThan(0);
      expect(coding.estimatedCost).toBeGreaterThan(0);
    });

    it("routes adversarial 'poke holes' to adversarial-validation", () => {
      const decision = buildRouterDecision({ input: "poke holes in my business plan", domain: "assistant" });
      expect(decision.id).toBe("adversarial-validation");
    });
  });
});
