// Unit tests for shared/lib/costModel.js — the plain-JS per-query ceiling model.
import { modelCeilingRate, projectedCost, maxCostPerQuery, isOverBudget } from "../../shared/lib/costModel.js";

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
});
