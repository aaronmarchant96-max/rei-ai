import { buildRouterDecision } from "../../src/lib/nightShiftRouter";
import { getFingerprintEntry } from "../../src/domains/_index.js";

describe("DeepSeek Routing Guarantee", () => {
  it("routes story domain queries to deepseek-chat", () => {
    const decision = buildRouterDecision({
      domain: "story",
      input: "write a full short story about a soviet gunman invading berlin suspenseful, engaging, twist",
    });
    expect(decision.model).toBe("deepseek-chat");
    expect(decision.id).toBe("story-architect");
  });

  it("routes generalist reasoning queries to deepseek-chat", () => {
    const decision = buildRouterDecision({
      domain: "assistant",
      input: "Should we migrate from a monolith to microservices for our growing payment gateway?",
    });
    expect(decision.model).toBe("deepseek-chat");
    expect(decision.id).toBe("structured-reasoning");
  });

  it("routes genealogy queries to deepseek-chat", () => {
    const decision = buildRouterDecision({
      domain: "genealogy",
      input: "Find the 1850 census records for Josiah Ramsey Sr in Davidson County",
    });
    expect(decision.model).toBe("deepseek-chat");
    expect(decision.id).toBe("genealogy-deep-dive");
  });

  it("routes legal queries to deepseek-chat", () => {
    const decision = buildRouterDecision({
      domain: "legal",
      input: "What is the decisive hinge holding in Donoghue v Stevenson?",
    });
    expect(decision.model).toBe("deepseek-chat");
    expect(decision.id).toBe("legal-hinge");
  });

  it("routes adversarial validation queries to deepseek-chat", () => {
    const decision = buildRouterDecision({
      domain: "assistant",
      input: "Challenge every assumption in this business proposal and tear down the argument",
    });
    expect(decision.model).toBe("deepseek-chat");
    expect(decision.id).toBe("adversarial-validation");
  });

  it("verifies all higher-reasoning domain definitions have model set to deepseek-chat", () => {
    const deepseekDomains = ["assistant", "story", "genealogy", "legal"];
    for (const domainId of deepseekDomains) {
      const fp = getFingerprintEntry(domainId);
      expect(fp).toBeDefined();
      expect(fp.model).toBe("deepseek-chat");
    }
  });
});
