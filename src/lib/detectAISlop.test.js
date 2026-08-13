import { detectAISlop, AI_SLOP_PATTERNS, AI_SLOP_THRESHOLDS } from "./detectAISlop.js";

describe("detectAISlop — deterministic AI-slop tone scanner", () => {
  it("returns clean for factual, plain copy", () => {
    const out = detectAISlop("REI routes each request to the cheapest model that still passes the safety floor. Savings are measured, not estimated.");
    expect(out.score).toBe(0);
    expect(out.verdict).toBe("clean");
    expect(out.flags).toEqual([]);
  });

  it("allows genuine enthusiasm without AI-slop phrasing", () => {
    // Real conviction, no canned value-verbs.
    const out = detectAISlop("The savings are real: 85.7% on the baseline. We measured it, you can reproduce it.");
    expect(out.score).toBe(0);
    expect(out.verdict).toBe("clean");
  });

  it("detects canned value-verb openers (category: opener)", () => {
    const out = detectAISlop("Unleash the full potential of your AI spend with REI.");
    const opener = out.details.find((d) => d.category === "opener");
    expect(opener).toBeDefined();
    expect(opener.label).toBe("unleash");
    expect(out.score).toBeGreaterThan(0);
  });

  it("detects hollow sales intensifiers (category: modal/hollow)", () => {
    const out = detectAISlop("Take your workflow to the next level and unlock the power of every request.");
    expect(out.details.some((d) => d.category === "modal")).toBe(true);
    expect(out.details.some((d) => d.category === "hollow")).toBe(true);
    expect(out.score).toBeGreaterThanOrEqual(4);
  });

  it("detects over-stacked cliches (category: stacking), weighting lower", () => {
    const out = detectAISlop("A seamless, effortless, game-changing experience.");
    expect(out.details.filter((d) => d.category === "stacking").length).toBe(3);
  });

  it("detects bottom-funnel conversion pressure", () => {
    const out = detectAISlop("Don't miss out — act now on this limited time offer.");
    const conv = out.details.filter((d) => d.category === "conversion");
    expect(conv.length).toBe(3);
    expect(out.score).toBeGreaterThanOrEqual(6);
  });

  it("aggregates flags by label and reports per-label totals", () => {
    const out = detectAISlop("Elevate your stack. Elevate your story.");
    const flag = out.flags.find((f) => f.label === "elevate your");
    expect(flag).toBeDefined();
    expect(flag.count).toBe(2);
    expect(flag.total).toBe(4); // weight 2 x 2 matches
    expect(out.score).toBe(4);
  });

  it("assigns the coarse verdict from the graded thresholds", () => {
    expect(detectAISlop("A plain factual sentence about caching and routing.").verdict).toBe("clean");
    // one filler word (weight 1) => minor
    expect(detectAISlop("A cutting-edge approach to routing.").verdict).toBe("minor");
    // stacking x2 (2) + opener (2) = 4 => sloppy
    expect(detectAISlop("Unleash a seamless, effortless pipeline.").verdict).toBe("sloppy");
    // heavy stacking + modal + hollow => slop
    expect(detectAISlop("Unleash a seamless, effortless, game-changing pipeline that unlocks the power of your stack.").verdict).toBe("slop");
  });

  it("is deterministic: identical input yields identical output", () => {
    const a = detectAISlop("Take your AI to the next level, supercharge your stack.");
    const b = detectAISlop("Take your AI to the next level, supercharge your stack.");
    expect(a).toEqual(b);
  });

  it("returns clean for empty / non-string input without throwing", () => {
    for (const bad of [undefined, null, "", 42]) {
      const out = detectAISlop(bad);
      expect(out.score).toBe(0);
      expect(out.verdict).toBe("clean");
    }
  });

  it("is dependency-free and ESM-exported for browser + serverless", () => {
    expect(typeof detectAISlop).toBe("function");
    expect(Array.isArray(AI_SLOP_PATTERNS)).toBe(true);
    expect(Array.isArray(AI_SLOP_THRESHOLDS)).toBe(true);
  });
});
