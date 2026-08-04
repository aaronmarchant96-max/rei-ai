import {
  getModelCosts,
  getModelCostRate,
  computeCeilingCost,
  computeActualCost,
  getCostBadgeLabel,
  DEFAULT_COST_MODEL,
} from "./costHelpers";

describe("costHelpers", () => {
  describe("getModelCosts", () => {
    it("returns { input, output, ceiling } for every known model", () => {
      const costs = getModelCosts(DEFAULT_COST_MODEL);
      expect(costs).toBeDefined();
      expect(typeof costs.input).toBe("number");
      expect(typeof costs.output).toBe("number");
      expect(typeof costs.ceiling).toBe("number");
      // Default model (llama-3.3-70b-versatile) is free on Groq tier — allow 0
      expect(costs.input).toBeGreaterThanOrEqual(0);
      expect(costs.output).toBeGreaterThanOrEqual(0);
    });

    it("has ceiling === input + output, NOT (input + output) / 2", () => {
      // Use a paid model for the non-average invariant; the free model is all zeros
      const costs = getModelCosts("deepseek-chat");
      expect(costs.ceiling).toBeCloseTo(costs.input + costs.output, 10);
      expect(costs.ceiling).not.toBeCloseTo((costs.input + costs.output) / 2, 10);
    });
  });

  describe("getModelCostRate", () => {
    it("returns the ceiling (sum, not average)", () => {
      const costs = getModelCosts("llama-3.3-70b-versatile");
      const rate = getModelCostRate("llama-3.3-70b-versatile");
      expect(rate).toBe(costs.ceiling);
      expect(rate).toBe(costs.input + costs.output);
    });
  });

  describe("computeCeilingCost", () => {
    it("uses ceiling rate for worst-case estimate", () => {
      const costs = getModelCosts("llama-3.3-70b-versatile");
      const cost = computeCeilingCost(1000, "llama-3.3-70b-versatile");
      expect(cost).toBe(costs.ceiling);
    });

    it("handles zero/null tokens", () => {
      expect(computeCeilingCost(0, DEFAULT_COST_MODEL)).toBe(0);
      expect(computeCeilingCost(null, DEFAULT_COST_MODEL)).toBe(0);
    });
  });

  describe("computeActualCost", () => {
    it("correctly computes split input/output cost", () => {
      const cost = computeActualCost(1000, 500, 0.00059, 0.00079);
      expect(cost).toBeCloseTo(0.000985, 8);
    });

    it("handles zero/null tokens", () => {
      expect(computeActualCost(0, 0, 0.1, 0.2)).toBe(0);
      expect(computeActualCost(null, null, 0.1, 0.2)).toBe(0);
    });

    it("ceiling >= actual for same token counts (conservative overestimate)", () => {
      const costs = getModelCosts("llama-3.3-70b-versatile");
      const actual = computeActualCost(1000, 500, costs.input, costs.output);
      const ceiling = computeCeilingCost(1500, "llama-3.3-70b-versatile");
      expect(ceiling).toBeGreaterThanOrEqual(actual);
    });
  });

  describe("getCostBadgeLabel", () => {
    it("shows 'actual' when split usage is present", () => {
      const costs = getModelCosts(DEFAULT_COST_MODEL);
      const label = getCostBadgeLabel(DEFAULT_COST_MODEL, 1500, {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
      });
      expect(label).toContain("actual");
      const expectedActual = computeActualCost(1000, 500, costs.input, costs.output);
      expect(label).toContain(expectedActual.toFixed(4));
    });

    it("shows 'est' when no split usage", () => {
      const label = getCostBadgeLabel(DEFAULT_COST_MODEL, 1000);
      expect(label).toContain("est");
    });

    it("shows 'est' when usage is null", () => {
      const label = getCostBadgeLabel(DEFAULT_COST_MODEL, 1000, null);
      expect(label).toContain("est");
    });

    it("shows 'est' when usage missing prompt/completion tokens", () => {
      const label = getCostBadgeLabel(DEFAULT_COST_MODEL, 1000, { total_tokens: 1000 });
      expect(label).toContain("est");
    });
  });
});
