// Unit tests for shared/lib/costModel.js — the plain-JS per-query ceiling model.
import { modelCeilingRate, projectedCost, maxCostPerQuery, isOverBudget, effectiveCost } from "../../shared/lib/costModel.js";

describe("costModel — projected per-query cost ceiling", () => {
  const OLD_MAX = process.env.MAX_COST_PER_QUERY;

  afterEach(() => {
    if (OLD_MAX === undefined) delete process.env.MAX_COST_PER_QUERY;
    else process.env.MAX_COST_PER_QUERY = OLD_MAX;
  });

  it("modelCeilingRate resolves known models from the mirror table", () => {
    expect(modelCeilingRate("deepseek-v4-flash")).toBeCloseTo(0.00042, 9);
    expect(modelCeilingRate("gpt-4o")).toBeCloseTo(0.0125, 9);
  });

  it("unknown models fall back to the conservative premium ceiling (never underestimates)", () => {
    expect(modelCeilingRate("some-future-model")).toBeCloseTo(0.0125, 9);
    expect(modelCeilingRate(undefined)).toBeCloseTo(0.0125, 9);
  });

  it("projectedCost = (tokens/1000) * ceiling", () => {
    // 1000 tokens on deepseek-v4-flash @ $0.00042/1K = $0.00042
    expect(projectedCost({ model: "deepseek-v4-flash", maxTokens: 1000 })).toBeCloseTo(0.00042, 9);
    // 2048 default when maxTokens absent
    expect(projectedCost({ model: "deepseek-v4-flash" })).toBeCloseTo((2048 / 1000) * 0.00042, 9);
    // non-positive maxTokens ignored → default
    expect(projectedCost({ model: "deepseek-v4-flash", maxTokens: 0 })).toBeCloseTo((2048 / 1000) * 0.00042, 9);
  });

  it("maxCostPerQuery returns null when env unset (no ceiling, backward-compatible)", () => {
    delete process.env.MAX_COST_PER_QUERY;
    expect(maxCostPerQuery()).toBeNull();
  });

  it("maxCostPerQuery parses a valid ceiling from env", () => {
    process.env.MAX_COST_PER_QUERY = "0.001";
    expect(maxCostPerQuery()).toBeCloseTo(0.001, 9);
  });

  it("maxCostPerQuery returns null for invalid/empty/non-positive values (never a broken ceiling)", () => {
    process.env.MAX_COST_PER_QUERY = "abc";
    expect(maxCostPerQuery()).toBeNull();
    process.env.MAX_COST_PER_QUERY = "0";
    expect(maxCostPerQuery()).toBeNull();
    process.env.MAX_COST_PER_QUERY = "-5";
    expect(maxCostPerQuery()).toBeNull();
    process.env.MAX_COST_PER_QUERY = "";
    expect(maxCostPerQuery()).toBeNull();
  });

  it("isOverBudget only refuses when a ceiling exists and projected cost exceeds it", () => {
    expect(isOverBudget(0.001, 0.002)).toBe(false);
    expect(isOverBudget(0.003, 0.002)).toBe(true);
    expect(isOverBudget(0.002, 0.002)).toBe(false); // equal ⇒ allowed
    expect(isOverBudget(0.003, null)).toBe(false); // no ceiling ⇒ allowed
    expect(isOverBudget(null, 0.002)).toBe(false); // no projection ⇒ allowed
  });

  describe("effectiveCost — cache-aware input cost", () => {
    // deepseek-v4-flash measured rates: miss $0.00014/1K, hit $0.0000028/1K.
    it("blends hit and miss by hitRate", () => {
      // 0% hit ⇒ all miss
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 1000, hitRate: 0 }))
        .toBeCloseTo(0.00014, 9);
      // 100% hit ⇒ all at the hit price
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 1000, hitRate: 1 }))
        .toBeCloseTo(0.0000028, 9);
      // 50% ⇒ (0.5·hit + 0.5·miss)
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 1000, hitRate: 0.5 }))
        .toBeCloseTo(0.5 * 0.0000028 + 0.5 * 0.00014, 9);
    });

    it("scales linearly with token count", () => {
      const per1k = effectiveCost({ model: "deepseek-v4-flash", tokens: 1000, hitRate: 0.5 });
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 5000, hitRate: 0.5 }))
        .toBeCloseTo(per1k * 5, 9);
    });

    it("clamps hitRate to [0, 1] and treats missing hitRate as 0 (no invented cache)", () => {
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 1000, hitRate: 5 }))
        .toBeCloseTo(0.0000028, 9); // clamped to 1
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 1000 }))
        .toBeCloseTo(0.00014, 9); // defaults to all-miss
    });

    it("falls back to the uncached input rate for models without declared cache rates", () => {
      // gpt-4o has no cache rates in the mirror table ⇒ miss = ceiling.
      expect(effectiveCost({ model: "gpt-4o", tokens: 1000, hitRate: 1 }))
        .toBeCloseTo(0.0125, 9);
    });

    it("returns 0 for non-positive token counts", () => {
      expect(effectiveCost({ model: "deepseek-v4-flash", tokens: 0, hitRate: 1 })).toBe(0);
      expect(effectiveCost({ model: "deepseek-v4-flash" })).toBe(0);
    });
  });
});
