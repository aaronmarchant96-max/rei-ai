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

  it("routes adversarial prompts to the premium validation path", () => {
    const decision = buildRouterDecision({ input: "Red-team this claim and prove it wrong", domain: "assistant" });

    expect(decision.id).toBe("adversarial-validation");
    expect(decision.model).toBe("gpt-4o");
    expect(resolveRoutingModel(decision)).toBe("gpt-4o");
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
});
