import { buildRouterDecision } from "../lib/nightShiftRouter.js";

const BLIND_CATEGORIES = {
  greeting: [
    "howdy partner",
    "morning everyone",
    "yo yo yo",
  ],
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

describe("Routing Eval — blind held-out set", () => {
  const results = [];
  let totalCost = 0;
  let totalPremiumCost = 0;
  let correctRoutes = 0;
  let incorrectRoutes = 0;
  let escalationCount = 0;
  let deterministicCount = 0;

  const pathwayCounts = { deterministic: 0, cheap: 0, medium: 0, premium: 0 };

  for (const [category, prompts] of Object.entries(BLIND_CATEGORIES)) {
    describe(category, () => {
      for (const prompt of prompts) {
        test(`"${prompt}"`, () => {
          const decision = buildRouterDecision({ input: prompt, domain: "assistant" });

          const cost = decision.estimatedCost || 0;
          const premiumCost = decision.premiumCost || 0;
          totalCost += cost;
          totalPremiumCost += premiumCost;

          const pathway = decision.pathway || "medium";
          pathwayCounts[pathway] = (pathwayCounts[pathway] || 0) + 1;
          if (pathway === "deterministic") deterministicCount++;
          if (pathway === "premium") escalationCount++;

          const labelMap = {
            "Simple Greeting": "greeting",
            "Coding Hinge": "coding",
            "Genealogy Deep Dive": "genealogy",
            "Story Architect": "creative",
            "Fact Check": "factCheck",
            "Structured Reasoning": "reasoning",
            "Adversarial Validation": "adversarial",
          };
          const actualLabel = labelMap[decision.label] || "unknown";

          if (actualLabel === category) {
            correctRoutes++;
          } else {
            incorrectRoutes++;
          }

          results.push({
            prompt,
            category,
            route: actualLabel,
            pathway,
            model: decision.model,
            confidence: decision.confidence,
            cost,
            premiumCost,
            savings: premiumCost - cost,
          });

          expect(decision).toHaveProperty("id");
          expect(decision).toHaveProperty("model");
          expect(decision).toHaveProperty("confidence");
          expect(decision).toHaveProperty("pathway");
          expect(decision).toHaveProperty("estimatedCost");
          expect(decision).toHaveProperty("premiumCost");
          expect(decision).toHaveProperty("confidence");
        });
      }
    });
  }

  describe("blind benchmark summary", () => {
    test("reports accuracy and savings", () => {
      const total = correctRoutes + incorrectRoutes;
      const accuracy = total > 0 ? Math.round((correctRoutes / total) * 100) : 0;
      const savings = totalPremiumCost - totalCost;
      const savingsPct = totalPremiumCost > 0 ? Math.round((savings / totalPremiumCost) * 100) : 0;

      console.log(`
═══════════════════════════════════════════
  BLIND EVAL BENCHMARK REPORT
═══════════════════════════════════════════
  Total prompts:              ${total}
  Routing accuracy:           ${accuracy}% (${correctRoutes} correct, ${incorrectRoutes} incorrect)
  Pathway breakdown:
    deterministic: ${pathwayCounts.deterministic} prompts
    cheap: ${pathwayCounts.cheap} prompts
    medium: ${pathwayCounts.medium} prompts
    premium: ${pathwayCounts.premium} prompts
  Escalation rate:            ${escalationCount}/${total} (${total > 0 ? Math.round((escalationCount / total) * 100) : 0}%)
  Deterministic handled:      ${deterministicCount} queries
  Total actual cost:          $${totalCost.toFixed(6)}
  Total premium-always cost:  $${totalPremiumCost.toFixed(6)}
  Savings:                    $${savings.toFixed(6)} (${savingsPct}%)
═══════════════════════════════════════════
`);

      results.forEach((r) => {
        const match = r.category === r.route ? "✓" : "✗";
        console.log(`  ${match} [${r.category}] "${r.prompt}" → ${r.route} (${r.pathway}, ${r.model})`);
      });

      expect(total).toBeGreaterThan(0);
    });
  });
});
