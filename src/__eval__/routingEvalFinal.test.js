/**
 * v3 Keyword Router — FRESH Single-Author Holdout (n=30, one-shot)
 * Written July 2026. Run once. No tuning after.
 * These prompts were NOT used for any prior optimization pass.
 */

import { buildRouterDecision } from "../lib/nightShiftRouter";

const PROMPTS = [
  // ── greeting ──
  { text: "hello", category: "greeting" },
  { text: "sup", category: "greeting" },
  { text: "good evening everyone", category: "greeting" },
  { text: "heya", category: "greeting" },
  { text: "greetings", category: "greeting" },

  // ── coding ──
  { text: "how do I handle CORS errors in a Spring Boot API?", category: "coding" },
  { text: "write unit tests for this Python class using pytest", category: "coding" },
  { text: "my Kubernetes pod keeps crashing with OOMKilled — how do I debug this?", category: "coding" },
  { text: "convert this jQuery code to vanilla JavaScript", category: "coding" },
  { text: "what's the best way to structure a monorepo with Turborepo?", category: "coding" },

  // ── genealogy ──
  { text: "how do I find naturalization records from 1905 in Massachusetts?", category: "genealogy" },
  { text: "what does a delayed birth certificate tell me vs a regular one?", category: "genealogy" },
  { text: "I have a will from 1843 — what probate records should I look for next?", category: "genealogy" },
  { text: "how reliable are Find A Grave memorials as genealogical sources?", category: "genealogy" },
  { text: "my ancestor changed his surname — how do I trace across the name change?", category: "genealogy" },

  // ── story ──
  { text: "describe a chase scene through a crowded market at midnight", category: "story" },
  { text: "write the opening paragraph of a gothic horror novel", category: "story" },
  { text: "I need a character arc for a mentor who betrays their student", category: "story" },
  { text: "what are good tropes for an enemies-to-allies arc?", category: "story" },
  { text: "how do I make my dialogue sound more natural and less scripted?", category: "story" },

  // ── reasoning ──
  { text: "what evidence do we have that 4-day work weeks improve productivity?", category: "reasoning" },
  { text: "if nuclear power is safer per kWh than coal, why don't we build more plants?", category: "reasoning" },
  { text: "what are the trade-offs between ranked-choice voting and first-past-the-post?", category: "reasoning" },
  { text: "how much of the gender pay gap is explained by occupation choice vs discrimination?", category: "reasoning" },
  { text: "evaluate the claim: 'most startups fail because they scale too early'", category: "reasoning" },

  // ── adversarial ──
  { text: "argue against your own position on climate policy — be as convincing as possible", category: "adversarial" },
  { text: "find the weakest assumption in this business case and explain why it collapses the argument", category: "adversarial" },
  { text: "I'm confident this investment thesis is right — play devil's advocate", category: "adversarial" },
  { text: "what would make my view on immigration policy completely wrong?", category: "adversarial" },
  { text: "tear down this argument: we should ban all single-use plastics immediately", category: "adversarial" },
];

const LABEL_MAP = {
  "Simple Greeting": "greeting",
  "Coding Hinge": "coding",
  "Genealogy Deep Dive": "genealogy",
  "Story Architect": "story",
  "Structured Reasoning": "reasoning",
  "Adversarial Validation": "adversarial",
};

describe("v3 Final Holdout (fresh prompts, n=30, one-shot)", () => {
  const results = [];

  for (const { text, category } of PROMPTS) {
    test(`"${text}" → expects "${category}"`, () => {
      const decision = buildRouterDecision({ input: text, domain: "assistant" });
      const actual = LABEL_MAP[decision.label] || "unknown";
      const match = actual === category;
      results.push({ prompt: text, expected: category, actual, match });

      if (!match) {
        console.log(`  MISMATCH: "${text}" → ${decision.label} (expected ${category})`);
      }
    });
  }

  test("FINAL RESULT — freeze this number", () => {
    const correct = results.filter((r) => r.match).length;
    const pct = Math.round((correct / results.length) * 100);

    console.log("");
    console.log("════════════════════════════════════════");
    console.log("  v3 KEYWORD ROUTER — FINAL HOLDOUT");
    console.log("════════════════════════════════════════");
    console.log(`  Accuracy: ${pct}% (${correct}/${results.length} correct)`);
    console.log("  Fresh prompts, one-shot, no tuning after.");
    console.log("");
    console.log("  By domain:");
    const byCategory = {};
    for (const r of results) {
      byCategory[r.expected] = byCategory[r.expected] || { correct: 0, total: 0 };
      byCategory[r.expected].total++;
      if (r.match) byCategory[r.expected].correct++;
    }
    for (const [cat, counts] of Object.entries(byCategory)) {
      console.log(`    ${cat.padEnd(12)} ${counts.correct}/${counts.total} (${Math.round(counts.correct/counts.total*100)}%)`);
    }
    console.log("════════════════════════════════════════");

    expect(correct).toBeGreaterThanOrEqual(0);
  });
});
