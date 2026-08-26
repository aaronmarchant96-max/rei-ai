import { brierScore, computeAuroc, calibrationBins, extractCanonicalObservations } from "./routePredictionEval";

describe("brierScore", () => {
  it("empty → null", () => {
    expect(brierScore([])).toBeNull();
  });

  it("perfect prediction → 0", () => {
    expect(brierScore([{ predicted: 0, actual: 0 }, { predicted: 1, actual: 1 }])).toBe(0);
  });

  it("worst prediction → 1", () => {
    expect(brierScore([{ predicted: 1, actual: 0 }])).toBe(1);
    expect(brierScore([{ predicted: 0, actual: 1 }])).toBe(1);
  });

  it("single point squared error", () => {
    expect(brierScore([{ predicted: 0.9, actual: 1 }])).toBeCloseTo(0.01, 10);
  });
});

describe("computeAuroc", () => {
  it("single-class population → null", () => {
    expect(computeAuroc([{ predicted: 0.1, actual: 0 }, { predicted: 0.2, actual: 0 }])).toBeNull();
    expect(computeAuroc([{ predicted: 0.1, actual: 1 }, { predicted: 0.2, actual: 1 }])).toBeNull();
    expect(computeAuroc([])).toBeNull();
  });

  it("perfect ranking → 1", () => {
    expect(computeAuroc([
      { predicted: 0.1, actual: 0 },
      { predicted: 0.2, actual: 0 },
      { predicted: 0.7, actual: 1 },
      { predicted: 0.9, actual: 1 },
    ])).toBe(1);
  });

  it("reversed ranking → 0", () => {
    expect(computeAuroc([
      { predicted: 0.7, actual: 0 },
      { predicted: 0.9, actual: 0 },
      { predicted: 0.1, actual: 1 },
      { predicted: 0.2, actual: 1 },
    ])).toBe(0);
  });

  it("chance ranking → 0.5", () => {
    expect(computeAuroc([
      { predicted: 0.1, actual: 0 },
      { predicted: 0.8, actual: 0 },
      { predicted: 0.4, actual: 1 },
      { predicted: 0.6, actual: 1 },
    ])).toBe(0.5);
  });
});

describe("calibrationBins", () => {
  it("produces numBins bins with correct boundaries", () => {
    const bins = calibrationBins([], 10);
    expect(bins).toHaveLength(10);
    expect(bins[0]).toEqual({ binLow: 0, binHigh: 0.1, count: 0, meanPredicted: null, actualFailureRate: null });
    expect(bins[9].binLow).toBe(0.9);
    expect(bins[9].binHigh).toBe(1);
  });

  it("bins a point into the correct bin", () => {
    const bins = calibrationBins([{ predicted: 0.05, actual: 1 }], 10);
    expect(bins[0].count).toBe(1);
    expect(bins[0].actualFailureRate).toBe(1);
    expect(bins[1].count).toBe(0);
  });
});
