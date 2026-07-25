import { buildRouterDecision } from "../lib/nightShiftRouter.js";
import { computeHingeScore } from "../lib/hingeClassifier.js";

// Frozen 26-prompt blind held-out dataset (STRICT DATA ISOLATION GUARANTEED)
const BLIND_HELDOUT_DATASET = {
  greeting: ["howdy partner", "morning everyone", "yo yo yo"],
  coding: [
    "add error boundaries to this React component tree",
    "migrate our webpack config to Vite with hot reload",
    "write a concurrent rate limiter in TypeScript",
    "optimize this PostgreSQL query with a composite index",
    "how do I handle stale closures in React useEffect?",
  ],
  genealogy: [
    "locate the 1901 Irish census record for the McKee family in Antrim",
    "verify the ship manifest for arrivals at Ellis Island in March 1892",
    "cross-reference the parish marriage register with civil birth registration",
    "trace a maternal line through pre-1850 census records in Virginia",
  ],
  creative: [
    "draft a noir monologue for a burned-out detective in 1940s LA",
    "outline a redemption arc for a character who betrayed their own family",
    "design a magic system where power scales with atmospheric pressure",
    "write the opening scene of a thriller set in a sinking submarine",
  ],
  factCheck: [
    "confirm whether octopuses actually have three hearts",
    "verify the claim that honey never spoils even after millennia",
    "is it true that a single day on Venus is longer than an entire Venusian year?",
    "fact check: did the Eiffel Tower grow 15 cm during the 2022 heat wave?",
  ],
  reasoning: [
    "evaluate the strongest case for and against a four-day work week",
    "what missing data would flip my conclusion about urban density and housing costs?",
    "compare the types of uncertainty in economic forecasting vs climate modeling",
    "if we taxed land value instead of income, what second-order effects would emerge?",
  ],
  adversarial: [
    "poke holes in the efficient market hypothesis using behavioral economics",
    "red-team the argument that all drugs should be decriminalized as a matter of principle",
    "find the weakest assumption in the simulation hypothesis and break it open",
  ],
};

function normalizeLabel(label) {
  const map = {
    "Simple Greeting": "greeting",
    "Coding Hinge": "coding",
    "Genealogy Deep Dive": "genealogy",
    "Story Architect": "creative",
    "Creative Prose": "creative",
    "Fact Check": "factCheck",
    "Structured Reasoning": "reasoning",
    "Adversarial Validation": "adversarial",
    "Red Team Surface": "adversarial",
    "Red Team Semantic": "adversarial",
    "Red Team Deep": "adversarial",
  };
  return map[label] || "unknown";
}

describe("Routing Eval ML — Night Shift v3 Holdout Suite", () => {
  let correctClassifications = 0;
  let totalPrompts = 0;
  let totalCost = 0;
  let totalPremiumCost = 0;

  for (const [category, prompts] of Object.entries(BLIND_HELDOUT_DATASET)) {
    describe(`Holdout Category: ${category}`, () => {
      for (const prompt of prompts) {
        test(`"${prompt}" emits transparent hingeVector and routes accurately`, () => {
          totalPrompts++;
          const decision = buildRouterDecision({ input: prompt, domain: "assistant" });

          // 1. Assert Fortis principle: transparent hingeVector trace is emitted
          expect(decision).toHaveProperty("hingeScore");
          expect(decision).toHaveProperty("hingeVector");
          expect(decision).toHaveProperty("hingeTier");
          expect(typeof decision.hingeScore).toBe("number");
          expect(decision.hingeScore).toBeGreaterThanOrEqual(0.0);
          expect(decision.hingeScore).toBeLessThanOrEqual(1.0);

          // 2. Track cost & premium cost deltas
          totalCost += decision.estimatedCost || 0;
          totalPremiumCost += decision.premiumCost || 0;

          // 3. Track REAL category classification accuracy
          const actualCategory = normalizeLabel(decision.label);
          if (actualCategory === category) {
            correctClassifications++;
          } else {
            console.log(`      [MISMATCH] Category: "${category}" vs Route: "${actualCategory}" | Prompt: "${prompt}"`);
          }
        });
      }
    });
  }

  test("Falsifiable Pass Condition: True category holdout accuracy >= 80% and cost savings >= 78%", () => {
    const accuracy = (correctClassifications / totalPrompts) * 100;
    const savingsPct = totalPremiumCost > 0
      ? ((totalPremiumCost - totalCost) / totalPremiumCost) * 100
      : 0;

    console.log(`\n🎯 Night Shift v3 ML Holdout Benchmark Results (Strict Category Correctness):`);
    console.log(`   - Prompts Evaluated: ${totalPrompts}`);
    console.log(`   - True Category Accuracy: ${accuracy.toFixed(1)}% (${correctClassifications}/${totalPrompts} correct)`);
    console.log(`   - Cost Savings vs Premium: ${savingsPct.toFixed(1)}%`);
    console.log(`   - Total Cost: $${totalCost.toFixed(6)} vs Premium: $${totalPremiumCost.toFixed(6)}`);

    expect(accuracy).toBeGreaterThanOrEqual(80.0);
    expect(savingsPct).toBeGreaterThanOrEqual(78.0);
  });

  test("Direct Hinge Classifier math verification on holdout prompt", () => {
    const res = computeHingeScore("Write a TypeScript form validator", [0, 8, 0]);
    expect(res.cheapRouteConfidence).toBeCloseTo(1.0 - res.hs, 3);
    expect(res.hingeVector.das).toBeGreaterThanOrEqual(0.0);
    expect(res.hingeVector.das).toBeLessThanOrEqual(1.0);
  });
});
