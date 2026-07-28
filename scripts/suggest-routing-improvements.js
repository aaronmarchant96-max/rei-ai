/**
 * Router Improvement Bootstrapper
 *
 * Engelbart H-LAM/T applied: the artifact (router) suggests its own improvements
 * based on the methodology (eval benchmarks). Run after any routing eval to get
 * keyword suggestions for closing accuracy gaps.
 *
 * Usage: node scripts/suggest-routing-improvements.js
 */

import { buildRouterDecision } from "../src/lib/nightShiftRouter.js";
import { getDomain, getDomainMatchTerms, DOMAINS } from "../src/domains/_index.js";

// ── Fresh holdout prompts (same as routingEvalFinal.test.js) ──
const PROMPTS = [
  { text: "hello", category: "greeting" },
  { text: "sup", category: "greeting" },
  { text: "good evening everyone", category: "greeting" },
  { text: "heya", category: "greeting" },
  { text: "greetings", category: "greeting" },
  { text: "how do I handle CORS errors in a Spring Boot API?", category: "coding" },
  { text: "write unit tests for this Python class using pytest", category: "coding" },
  { text: "my Kubernetes pod keeps crashing with OOMKilled — how do I debug this?", category: "coding" },
  { text: "convert this jQuery code to vanilla JavaScript", category: "coding" },
  { text: "what's the best way to structure a monorepo with Turborepo?", category: "coding" },
  { text: "how do I find naturalization records from 1905 in Massachusetts?", category: "genealogy" },
  { text: "what does a delayed birth certificate tell me vs a regular one?", category: "genealogy" },
  { text: "I have a will from 1843 — what probate records should I look for next?", category: "genealogy" },
  { text: "how reliable are Find A Grave memorials as genealogical sources?", category: "genealogy" },
  { text: "my ancestor changed his surname — how do I trace across the name change?", category: "genealogy" },
  { text: "describe a chase scene through a crowded market at midnight", category: "story" },
  { text: "write the opening paragraph of a gothic horror novel", category: "story" },
  { text: "I need a character arc for a mentor who betrays their student", category: "story" },
  { text: "what are good tropes for an enemies-to-allies arc?", category: "story" },
  { text: "how do I make my dialogue sound more natural and less scripted?", category: "story" },
  { text: "what evidence do we have that 4-day work weeks improve productivity?", category: "reasoning" },
  { text: "if nuclear power is safer per kWh than coal, why don't we build more plants?", category: "reasoning" },
  { text: "what are the trade-offs between ranked-choice voting and first-past-the-post?", category: "reasoning" },
  { text: "how much of the gender pay gap is explained by occupation choice vs discrimination?", category: "reasoning" },
  { text: "evaluate the claim: 'most startups fail because they scale too early'", category: "reasoning" },
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

const DOMAIN_TO_ROUTER_ID = {
  greeting: "assistant",
  coding: "coding",
  genealogy: "genealogy",
  story: "story",
  reasoning: "assistant",
  adversarial: "adversarial",
};

console.log("════════════════════════════════════════");
console.log("  ROUTER IMPROVEMENT BOOTSTRAPPER");
console.log("  Engelbart H-LAM/T: artifact suggests its own fixes");
console.log("════════════════════════════════════════\n");

let correct = 0;
const mismatches = [];
const byDomain = {};

for (const { text, category } of PROMPTS) {
  const decision = buildRouterDecision({ input: text, domain: "assistant" });
  const actual = LABEL_MAP[decision.label] || "unknown";
  const match = actual === category;

  if (match) correct++;
  else mismatches.push({ prompt: text, expected: category, actual, route: decision.label });

  byDomain[category] = byDomain[category] || { correct: 0, total: 0 };
  byDomain[category].total++;
  if (match) byDomain[category].correct++;
}

console.log(`Accuracy: ${Math.round((correct / PROMPTS.length) * 100)}% (${correct}/${PROMPTS.length})\n`);

if (mismatches.length === 0) {
  console.log("No mismatches found. Router is clean.\n");
} else {
  console.log(`${mismatches.length} mismatches found. Analyzing keyword gaps...\n`);

  // Group mismatches by expected domain
  const byExpected = {};
  for (const m of mismatches) {
    byExpected[m.expected] = byExpected[m.expected] || [];
    byExpected[m.expected].push(m);
  }

  for (const [domain, ms] of Object.entries(byExpected)) {
    const routerId = DOMAIN_TO_ROUTER_ID[domain] || "assistant";
    const existingTerms = getDomainMatchTerms(routerId);
    const domainConfig = getDomain(routerId);

    console.log(`  ${domain.toUpperCase()} (${ms.length} mismatches → "${routerId}" domain):`);

    // Extract unique words from mismatched prompts that aren't already in match terms
    const missingWords = new Set();
    for (const m of ms) {
      const words = m.prompt.toLowerCase().split(/\s+/);
      for (const w of words) {
        const clean = w.replace(/[^a-z0-9.-]/g, "");
        if (clean.length < 3) continue;
        if (existingTerms.includes(clean)) continue;
        missingWords.add(clean);
      }
    }

    if (missingWords.size > 0) {
      const suggestions = [...missingWords].slice(0, 8).join(", ");
      console.log(`    Suggested terms to add: ${suggestions}`);
    }

    // Check for words that appear in mismatches that already exist but might cause issues
    const overlappingTerms = [];
    for (const m of ms) {
      for (const term of existingTerms) {
        if (m.prompt.toLowerCase().includes(term.toLowerCase()) && !overlappingTerms.includes(term)) {
          overlappingTerms.push(term);
        }
      }
    }
    if (overlappingTerms.length > 0) {
      const unique = [...new Set(overlappingTerms)];
      console.log(`    ⚠️  Existing terms present but not matching: ${unique.join(", ")}`);
    }
    console.log();
  }

  // Check for false positive risks — terms that are too broad
  console.log("  FALSE POSITIVE RISK CHECK:");
  for (const domain of DOMAINS) {
    const terms = domain.matchTerms || [];
    const broadTerms = terms.filter((t) => t.length <= 4 && !t.includes("."));
    if (broadTerms.length > 0) {
      console.log(`    ${domain.id}: ${broadTerms.join(", ")} (short terms — risk of over-match)`);
    }
  }
  console.log();
}

console.log("════════════════════════════════════════");
console.log("  Review these suggestions before applying.");
console.log("  Engelbart principle: artifact proposes, human decides.");
console.log("════════════════════════════════════════\n");
