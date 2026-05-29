import {
  buildCardoGuardComparison,
  calculateCardoGuardReview,
  getSyntheticFalseAlarmRate
} from "./cardoGuard.js";

describe("cardoGuard", () => {
  it("calculates the hinge and recommendation from synthetic inputs", () => {
    const review = calculateCardoGuardReview({
      scenarioId: "routine-inspection-nudge",
      confidence: 78,
      costToAct: 80000,
      costToMiss: 90000
    });

    expect(getSyntheticFalseAlarmRate(78)).toBe(0.44);
    expect(review.calibratedEventLikelihood).toBeCloseTo(0.56);
    expect(review.recommendation).toBe("ACT");
    expect(review.shouldAct).toBe(true);
    expect(review.expectedActionWaste).toBeCloseTo(35200);
    expect(review.expectedMissLoss).toBeCloseTo(50400);
    expect(review.explanation).toContain("Acting clears the gate");
  });

  it("describes what would change the verdict", () => {
    const review = calculateCardoGuardReview({
      scenarioId: "road-closure-reroute",
      confidence: 82,
      costToAct: 180000,
      costToMiss: 1200000
    });

    expect(buildCardoGuardComparison(review)).toEqual([
      "Raise the cost of acting.",
      "Show a higher calibrated false-alarm band.",
      "Prove the miss cost is smaller than assumed.",
      "Show that the disruption impact is smaller or less likely than assumed."
    ]);
  });

  it("falls back to the default scenario and lowest confidence band when inputs are invalid", () => {
    const review = calculateCardoGuardReview({
      scenarioId: "missing-scenario",
      confidence: "abc",
      costToAct: -100,
      costToMiss: -200
    });

    expect(review.scenario.id).toBe("road-closure-reroute");
    expect(review.confidenceBand).toBe("very low");
    expect(getSyntheticFalseAlarmRate(65)).toBe(0.57);
    expect(review.costToAct).toBe(0);
    expect(review.costToMiss).toBe(0);
    expect(review.recommendation).toBe("DO NOT ACT");
  });
});
