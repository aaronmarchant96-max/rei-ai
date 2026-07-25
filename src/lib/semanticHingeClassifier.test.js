import {
  computeSemanticHingeScore,
  CALIBRATED_TAU,
  CALIBRATED_THETA_OOD,
} from "./semanticHingeClassifier.js";

describe("semanticHingeClassifier (v4 Vector Engine)", () => {
  test("computes domain similarity, Softmax probabilities, and DAS for text prompt", async () => {
    const res = await computeSemanticHingeScore("debug memory leak in WebSocket listener");
    expect(res).toHaveProperty("topDomain");
    expect(res).toHaveProperty("topSimilarity");
    expect(res).toHaveProperty("topProbability");
    expect(res).toHaveProperty("das");
    expect(res).toHaveProperty("hingeScore");
    expect(res).toHaveProperty("cheapRouteConfidence");
    expect(typeof res.das).toBe("number");
    expect(res.das).toBeGreaterThanOrEqual(0.0);
    expect(res.das).toBeLessThanOrEqual(1.0);
  });

  test("flags low-probability prompts as Out-Of-Distribution (OOD)", async () => {
    // Custom thetaOod threshold test
    const res = await computeSemanticHingeScore("random prompt", { thetaOod: 0.99 });
    expect(res.isOOD).toBe(true);
    expect(res.hingeScore).toBeGreaterThanOrEqual(0.90);
  });

  test("preserves mathematical invariant cheapRouteConfidence === 1.0 - hingeScore", async () => {
    const res = await computeSemanticHingeScore("greetings and salutations");
    expect(res.cheapRouteConfidence).toBeCloseTo(1.0 - res.hingeScore, 4);
  });
});
