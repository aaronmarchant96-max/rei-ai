import { computeReplayStats } from "./costReplayStats";

describe("computeReplayStats", () => {
  it("returns zeros for an empty/missing document", () => {
    expect(computeReplayStats(null)).toEqual({
      entries: 0,
      estimated: 0,
      premium: 0,
      savings: 0,
      savingsPercent: 0,
      rescues: 0,
      truncated: 0,
      byCategory: {},
    });
  });

  it("computes pooled savings across entries", () => {
    const stats = computeReplayStats({
      entries: [
        { domain: "coding", estimatedCost: 0.0003, premiumCost: 0.003 },
        { domain: "story", estimatedCost: 0.0001, premiumCost: 0.002 },
      ],
    });
    expect(stats.entries).toBe(2);
    expect(stats.premium).toBeCloseTo(0.005, 10);
    expect(stats.estimated).toBeCloseTo(0.0004, 10);
    expect(stats.savings).toBeCloseTo(0.0046, 10);
    expect(stats.savingsPercent).toBeCloseTo(92, 3);
  });

  it("stratifies by category", () => {
    const stats = computeReplayStats({
      entries: [
        { domain: "coding", estimatedCost: 0.0001, premiumCost: 0.001 },
        { domain: "coding", estimatedCost: 0.0002, premiumCost: 0.001 },
        { domain: "legal", estimatedCost: 0.0009, premiumCost: 0.001 },
      ],
    });
    expect(stats.byCategory.coding.entries).toBe(2);
    expect(stats.byCategory.coding.savingsPercent).toBeCloseTo(85, 3);
    expect(stats.byCategory.legal.savingsPercent).toBeCloseTo(10, 3);
  });

  it("counts rescue/truncation signals per category and pooled", () => {
    const stats = computeReplayStats({
      entries: [
        { domain: "coding", rescue: true, truncated: false },
        { domain: "coding", rescue: false, truncated: true },
        { domain: "story", rescue: true },
      ],
    });
    expect(stats.rescues).toBe(2);
    expect(stats.truncated).toBe(1);
    expect(stats.byCategory.coding.rescues).toBe(1);
    expect(stats.byCategory.coding.truncated).toBe(1);
    expect(stats.byCategory.story.rescues).toBe(1);
  });

  it("tolerates missing cost fields (treat as 0, do not throw)", () => {
    const stats = computeReplayStats({
      entries: [{ domain: "legal", estimatedCost: 0.001 }],
    });
    expect(stats.premium).toBe(0);
    expect(stats.byCategory.legal.savingsPercent).toBe(0);
  });
});
