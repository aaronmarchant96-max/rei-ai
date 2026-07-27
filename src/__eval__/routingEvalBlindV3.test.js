/**
 * V3 Single-Author Holdout Eval
 *
 * METHODOLOGICAL NOTE:
 *   Same person wrote router rules AND these prompts — not truly blind.
 *   This is a LESS-LEAKED eval than prior sets, not a CLEAN one.
 *   n=30 (5 per domain) = wide confidence interval (~±9% at 95% CI).
 *   No pass/fail threshold — raw number reported, whatever it is.
 *   Run-once: do not tune the router after seeing results.
 */

import { buildRouterDecision } from "../lib/nightShiftRouter.js";

const PROMPTS = [
  // ── greeting (expect: "Simple Greeting") ──
  { text: "hey there", category: "greeting" },
  { text: "good afternoon", category: "greeting" },
  { text: "howdy", category: "greeting" },
  { text: "yo", category: "greeting" },
  { text: "hi everyone", category: "greeting" },

  // ── coding (expect: "Coding Hinge") ──
  { text: "write a Python function to merge two sorted lists", category: "coding" },
  { text: "how do I set up a Next.js project with Tailwind?", category: "coding" },
  { text: "debug this Rust borrow checker error", category: "coding" },
  { text: "refactor this SQL query to use a CTE instead of a subquery", category: "coding" },
  { text: "What's the correct way to handle errors in an Express middleware?", category: "coding" },

  // ── genealogy (expect: "Genealogy Deep Dive") ──
  { text: "find the 1910 census record for William Johnson in Ohio", category: "genealogy" },
  { text: "trace my maternal line back to the American Revolution", category: "genealogy" },
  { text: "what does a parish burial record tell me about pre-1837 English research?", category: "genealogy" },
  { text: "cross-reference the family Bible entry with the county marriage register", category: "genealogy" },
  { text: "disambiguate three John Smiths in 1850 Kentucky", category: "genealogy" },

  // ── creative/story (expect: "Story Architect") ──
  { text: "outline a redemption arc for a corrupt politician", category: "story" },
  { text: "write a scene where two old rivals meet after twenty years", category: "story" },
  { text: "build a fantasy world where magic drains memory", category: "story" },
  { text: "draft dialogue for a hostage negotiator's final appeal", category: "story" },
  { text: "design a mystery plot where the detective is the real killer", category: "story" },

  // ── reasoning (expect: "Structured Reasoning") ──
  { text: "what are the strongest arguments for and against congestion pricing?", category: "reasoning" },
  { text: "if we banned private car ownership in city centers, what second-order effects would emerge?", category: "reasoning" },
  { text: "evaluate the evidence that minimum wage increases reduce employment", category: "reasoning" },
  { text: "what evidence would change my mind about remote work productivity?", category: "reasoning" },
  { text: "compare the types of uncertainty in economic forecasting vs climate modeling", category: "reasoning" },

  // ── adversarial (expect: "Adversarial Validation") ──
  { text: "red-team this business plan and find three fatal flaws", category: "adversarial" },
  { text: "poke holes in the argument that AI will replace all knowledge work", category: "adversarial" },
  { text: "stress-test my thesis that social media causes political polarization", category: "adversarial" },
  { text: "challenge every assumption in this market analysis", category: "adversarial" },
  { text: "break it: find the weakest link in this security proposal", category: "adversarial" },
];

const LABEL_MAP = {
  "Simple Greeting": "greeting",
  "Coding Hinge": "coding",
  "Genealogy Deep Dive": "genealogy",
  "Story Architect": "story",
  "Structured Reasoning": "reasoning",
  "Adversarial Validation": "adversarial",
};

describe("V3 Single-Author Holdout (n=30, one-shot)", () => {
  const results = [];

  for (const { text, category } of PROMPTS) {
    test(`"${text}" → expects "${category}"`, () => {
      const decision = buildRouterDecision({ input: text, domain: "assistant" });
      const actual = LABEL_MAP[decision.label] || decision.id || "unknown";
      const match = actual === category;

      results.push({ prompt: text, expected: category, actual, match, route: decision.label, model: decision.model });

      if (!match) {
        console.log(`  MISMATCH: "${text}" → ${decision.label} (expected ${category})`);
      }
    });
  }

  test("ONE-SHOT ACCURACY — report only, no threshold", () => {
    const correct = results.filter((r) => r.match).length;
    const total = results.length;
    const pct = Math.round((correct / total) * 100);

    console.log("");
    console.log("════════════════════════════════════════");
    console.log("  V3 SINGLE-AUTHOR HOLDOUT RESULT");
    console.log("════════════════════════════════════════");
    console.log(`  Accuracy: ${pct}% (${correct}/${total} correct)`);
    console.log("");
    console.log("  Context:");
    console.log("  - Same person wrote rules + prompts (not truly blind)");
    console.log("  - n=30 → ~±9% margin of error at 95% CI");
    console.log("  - One-shot: do not tune router against this set");
    console.log("  - v3 keyword router with Phase-2 expanded regexes");
    console.log("");
    console.log("  By domain:");
    const byCategory = {};
    for (const r of results) {
      byCategory[r.expected] = byCategory[r.expected] || { correct: 0, total: 0 };
      byCategory[r.expected].total++;
      if (r.match) byCategory[r.expected].correct++;
    }
    for (const [cat, counts] of Object.entries(byCategory)) {
      const p = Math.round((counts.correct / counts.total) * 100);
      console.log(`    ${cat.padEnd(12)} ${counts.correct}/${counts.total} (${p}%)`);
    }
    console.log("════════════════════════════════════════");

    expect(correct).toBeGreaterThanOrEqual(0); // always passes — no threshold
  });
});
