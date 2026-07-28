import { getDomain, getDomainPrompt, getDomainMatchTerms, getDomainProfiles, DOMAINS } from "../domains/_index.js";

describe("domain registry", () => {
  it("has 5 domains", () => {
    expect(DOMAINS).toHaveLength(5);
  });

  it("getDomain returns correct domain by id", () => {
    const legal = getDomain("legal");
    expect(legal.label).toBe("The Precedent Engine");
    expect(legal.sessionLabel).toBe("precedent analysis");

    const coding = getDomain("coding");
    expect(coding.label).toBe("The Engineer");
    expect(coding.sessionLabel).toBe("coding session");
  });

  it("getDomain returns undefined for unknown domain", () => {
    expect(getDomain("nonsense")).toBeUndefined();
  });

  it("getDomainPrompt returns prompt strings", () => {
    const prompt = getDomainPrompt("legal");
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("CARDO REI");
    expect(prompt).toContain("Donoghue v Stevenson");
  });

  it("getDomainPrompt falls back to assistant for unknown domain", () => {
    const prompt = getDomainPrompt("nonsense");
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("REI, The Generalist");
  });

  it("getDomainMatchTerms returns terms array", () => {
    const terms = getDomainMatchTerms("coding");
    expect(Array.isArray(terms)).toBe(true);
    expect(terms).toContain("react");
    expect(terms).toContain("api");
  });

  it("getDomainProfiles returns display-ready profiles", () => {
    const profiles = getDomainProfiles();
    expect(profiles).toHaveLength(5);
    expect(profiles[0]).toHaveProperty("id");
    expect(profiles[0]).toHaveProperty("label");
    expect(profiles[0]).toHaveProperty("description");
    expect(profiles[0]).toHaveProperty("rules");
  });
});
