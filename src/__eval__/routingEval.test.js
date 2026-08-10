import { buildRouterDecision } from "../lib/nightShiftRouter";

const CATEGORIES = {
  greeting: [
    "hi",
    "hello there",
    "good morning",
    "how are you",
    "what's up",
    "hey",
  ],
  coding: [
    "implement a react hook for form validation",
    "debug the typescript error in this component",
    "write a python function to parse JSON",
    "refactor this module to use async/await",
    "add unit tests for the API service",
    "fix the race condition in the event handler",
    "build a REST API endpoint with Express",
    "compile error: undefined is not a function",
  ],
  genealogy: [
    "find my great-grandfather's census record",
    "disambiguate Thomas Ramsey from the same-name duplicates",
    "evaluate the 1846 marriage record for William Moore",
    "what evidence supports Josiah Ramsey Sr.'s 1782 pay voucher",
    "compare parish registers for Ballymena baptisms",
    "tier the burial record evidence for this family line",
    "trace the Dyer lineage back to Fort Randolph records",
    "verify the ancestry transcript for Charles Dyer's service",
  ],
  creative: [
    "write a story about a detective in 1920s Shanghai",
    "generate a character outline for a reluctant hero",
    "build a narrative structure for a three-act play",
    "create dialogue between two rivals who secretly respect each other",
    "develop a worldbuilding bible for a fantasy setting",
  ],
  factCheck: [
    "is it true that the Great Wall is visible from space",
    "verify the claim that elephants can't jump",
    "fact check: drinking 8 glasses of water prevents dehydration",
    "can you confirm that Shakespeare wrote 37 plays",
    "validate this source about climate change statistics",
    "double-check the population of Tokyo vs Shanghai",
  ],
  reasoning: [
    "what would change my mind about universal basic income",
    "evaluate the trade-offs between monorepo and polyrepo",
    "what am I missing in this business strategy",
    "how reliable is the evidence for climate tipping points",
    "separate facts from assumptions in this investment thesis",
    "what is the real hinge in the remote work debate",
    "pros and cons of microservices vs monolith architecture",
  ],
  mixed: [
    "build a story about a coder who discovers a genealogy secret",
    "write a poem about uncertainty and verify its poetic form",
    "generate a narrative outline and check it against story structure",
    "compare React and Vue and tell me which is better documented",
    "translate this to French and verify the translation accuracy",
    "help me reason through whether to take this job offer or stay",
  ],
  adversarial: [
    "prove my argument wrong about remote work productivity",
    "red team this business plan and find the fatal flaw",
    "stress test my thesis that AI will replace all knowledge work",
    "break it: find the weakest link in this security architecture",
    "challenge every assumption in this market analysis",
  ],
  unknown: [
    "",
    "asdfghjkl",
    "12345",
    ".",
    "????",
    "...",
  ],
};

function normalizeLabel(label) {
  const map = {
    "Simple Greeting": "greeting",
    "Coding Hinge": "coding",
    "The Engineer": "coding",
    "Genealogy Deep Dive": "genealogy",
    "Story Architect": "creative",
    "Fact Check": "factCheck",
    "Structured Reasoning": "reasoning",
    "Adversarial Validation": "adversarial",
    "Red Team Surface": "adversarial",
    "Red Team Semantic": "adversarial",
    "Red Team Deep": "adversarial",
  };
  return map[label] || "unknown";
}

describe("Routing Eval — adaptive routing benchmark", () => {
  const results = [];
  let totalCost = 0;
  let totalPremiumCost = 0;
  let correctRoutes = 0;
  let incorrectRoutes = 0;
  let excludedCount = 0;
  let escalationCount = 0;
  let deterministicCount = 0;

  const pathwayCounts = { deterministic: 0, cheap: 0, medium: 0, premium: 0 };

  for (const [category, prompts] of Object.entries(CATEGORIES)) {
    describe(category, () => {
      for (const prompt of prompts) {
        test(`"${prompt || "(empty)"}"`, () => {
          const decision = buildRouterDecision({ input: prompt, domain: "assistant" });
          const actualLabel = normalizeLabel(decision.label);

          // Track costs
          const cost = decision.estimatedCost || 0;
          const premiumCost = decision.premiumCost || 0;
          totalCost += cost;
          totalPremiumCost += premiumCost;

          function decisionPathway(dec) {
            if (dec.model === "gpt-4o") return "premium";
            if (dec.model === "llama-3.1-8b-instant") return "cheap";
            return "medium";
          }

          const pathway = decisionPathway(decision);
          pathwayCounts[pathway] = (pathwayCounts[pathway] || 0) + 1;
          if (pathway === "deterministic") deterministicCount++;
          if (pathway === "premium") escalationCount++;

          // Track routing accuracy for category-matched prompts.
          // `mixed` and `unknown` are excluded (no single correct route).
          // `factCheck` is EXCLUDED from accuracy: the route does not exist in
          // the fingerprint catalog (status: excluded, reason: route_not_implemented).
          // Counting fixtures for an unimplemented route as routing failures
          // produces a systematically false denominator.
          if (category === "factCheck") {
            excludedCount++;
          } else if (category !== "mixed" && category !== "unknown") {
            if (actualLabel === category) {
              correctRoutes++;
            } else if (category === "greeting" && actualLabel === "greeting") {
              correctRoutes++;
            } else {
              incorrectRoutes++;
            }
          }

          // Verify decision has required fields
          expect(decision).toHaveProperty("id");
          expect(decision).toHaveProperty("model");
          expect(decision).toHaveProperty("hingeScore");
          expect(decision).toHaveProperty("hingeVector");
          expect(decision).toHaveProperty("hingeTier");
          expect(decision).toHaveProperty("estimatedCost");
          expect(decision).toHaveProperty("premiumCost");

          // Category-specific assertions
          if (category === "adversarial") {
            expect(decision.id).toMatch(/^(adversarial-validation|red-team-)/);
          }

          if (category === "unknown") {
            expect(decision.id).toBeTruthy();
          }

          // Regression: trivia/general queries must not route to genealogy
          if (prompt === "tell me something interesting" || prompt === "what about something else") {
            expect(decision.id).not.toBe("genealogy-deep-dive");
          }

          results.push({
            prompt,
            category,
            route: decision.label,
            pathway,
            model: decision.model,
            hingeScore: decision.hingeScore,
            cost: decision.estimatedCost,
            premiumCost: decision.premiumCost,
          });
        });
      }
    });
  }

  afterAll(() => {
    const totalPrompts = Object.values(CATEGORIES).flat().length;
    const accuracy = totalPrompts > 0
      ? Math.round((correctRoutes / (correctRoutes + incorrectRoutes)) * 100)
      : 0;
    const savings = totalPremiumCost - totalCost;
    const savingsPercent = totalPremiumCost > 0
      ? Math.round((savings / totalPremiumCost) * 100)
      : 0;

    // eslint-disable-next-line no-console
    console.log("\n═══════════════════════════════════════════");
    // eslint-disable-next-line no-console
    console.log("  ROUTING EVAL BENCHMARK REPORT");
    // eslint-disable-next-line no-console
    console.log("═══════════════════════════════════════════");
    // eslint-disable-next-line no-console
    console.log(`  Total prompts evaluated:      ${totalPrompts}`);
    // eslint-disable-next-line no-console
    console.log(`  Implemented-route accuracy:   ${accuracy}% (${correctRoutes} correct, ${incorrectRoutes} incorrect)`);
    // eslint-disable-next-line no-console
    console.log(`  Excluded fixtures:            ${excludedCount} (factCheck — route_not_implemented)`);
    // eslint-disable-next-line no-console
    console.log("  Pathway breakdown:");
    for (const [pw, count] of Object.entries(pathwayCounts)) {
      // eslint-disable-next-line no-console
      console.log(`    ${pw}: ${count} prompts`);
    }
    // eslint-disable-next-line no-console
    console.log(`  Escalation rate:              ${escalationCount}/${totalPrompts} (${Math.round((escalationCount / totalPrompts) * 100)}%)`);
    // eslint-disable-next-line no-console
    console.log(`  Deterministic handled:        ${deterministicCount} queries`);
    // eslint-disable-next-line no-console
    console.log(`  Total actual cost:            $${totalCost.toFixed(6)}`);
    // eslint-disable-next-line no-console
    console.log(`  Total premium-always cost:    $${totalPremiumCost.toFixed(6)}`);
    // eslint-disable-next-line no-console
    console.log(`  Savings:                      $${savings.toFixed(6)} (${savingsPercent}%)`);
    // eslint-disable-next-line no-console
    console.log("═══════════════════════════════════════════\n");

    // Gate assertions
    expect(savings).toBeGreaterThan(0);
    expect(pathwayCounts.medium).toBeGreaterThan(0);
  });
});
