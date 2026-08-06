/**
 * HingeScore Calibration Engine — offline batch (no live router changes).
 *
 * Runs after contamination gate has cleared all source suites.
 * Produces a per-bucket correlation report: hingeScore vs. router accuracy
 * and (optionally) debate-model disagreement.
 */

import { buildRouterDecision } from "../lib/nightShiftRouter";
import { BLIND_HELDOUT_DATASET_V2_50 } from "./blindDatasetV2.js";

// --- Step 1: Pool builder ---------------------------------------------------

// Shared 27-prompt dataset used by both routingEvalBlind.test.js
// and routingEvalML.test.js (100% overlap — copy once).
const BLIND_CATEGORIES = {
  greeting: [
    "howdy partner", "morning everyone", "yo yo yo",
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

const V3_PROMPTS = [
  { text: "hey there", category: "greeting" },
  { text: "good afternoon", category: "greeting" },
  { text: "howdy", category: "greeting" },
  { text: "yo", category: "greeting" },
  { text: "hi everyone", category: "greeting" },
  { text: "write a Python function to merge two sorted lists", category: "coding" },
  { text: "how do I set up a Next.js project with Tailwind?", category: "coding" },
  { text: "debug this Rust borrow checker error", category: "coding" },
  { text: "refactor this SQL query to use a CTE instead of a subquery", category: "coding" },
  { text: "What's the correct way to handle errors in an Express middleware?", category: "coding" },
  { text: "find the 1910 census record for William Johnson in Ohio", category: "genealogy" },
  { text: "trace Dutch Reformed Church records in Cape Town from 1880-1895", category: "genealogy" },
  { text: "locate the birth certificate of Maria Rossi in Palermo, ~1878", category: "genealogy" },
  { text: "determine if John Smith in the 1850 Kentucky census is the same person as in the 1860 Indiana census", category: "genealogy" },
  { text: "find any Austrian military records for a Jewish officer stationed in Lviv around 1905", category: "genealogy" },
  { text: "outline a redemption arc for a corrupt politician", category: "creative" },
  { text: "write a scene where two old rivals meet after twenty years", category: "creative" },
  { text: "build a fantasy world where magic drains memory", category: "creative" },
  { text: "draft dialogue for a hostage negotiator's final appeal", category: "creative" },
  { text: "design a mystery plot where the detective is the real killer", category: "creative" },
  { text: "what are the strongest arguments for and against congestion pricing?", category: "reasoning" },
  { text: "if we banned private car ownership in city centers, what second-order effects would emerge?", category: "reasoning" },
  { text: "evaluate the evidence that minimum wage increases reduce employment", category: "reasoning" },
  { text: "what evidence would change my mind about remote work productivity?", category: "reasoning" },
  { text: "compare the types of uncertainty in economic forecasting vs climate modeling", category: "reasoning" },
  { text: "red-team this business plan and find three fatal flaws", category: "adversarial" },
  { text: "poke holes in the argument that AI will replace all knowledge work", category: "adversarial" },
  { text: "stress-test my thesis that social media causes political polarization", category: "adversarial" },
  { text: "challenge every assumption in this market analysis", category: "adversarial" },
  { text: "break it: find the weakest link in this security proposal", category: "adversarial" },
];

const SEMANTIC_PROMPTS = [
  { text: "hey what's going on", category: "greeting" },
  { text: "good to see you", category: "greeting" },
  { text: "hello there friend", category: "greeting" },
  { text: "hi how are you doing", category: "greeting" },
  { text: "yo what's good", category: "greeting" },
  { text: "how do I set up Docker Compose for a Node.js app with PostgreSQL?", category: "coding" },
  { text: "I need to convert this Python script to a FastAPI endpoint", category: "coding" },
  { text: "what's wrong with this regex: /^(foo|bar$/", category: "coding" },
  { text: "tell me the fastest way to generate JWT tokens in a Go middleware", category: "coding" },
  { text: "how would you use nginx to rate-limit API endpoints", category: "coding" },
  { text: "where would I find Polish baptismal records from Krakow in 1830?", category: "genealogy" },
  { text: "I'm looking for proof that a Ukrainian soldier married a Polish nurse near Lvov in 1917", category: "genealogy" },
  { text: "can you find a French Protestant family that migrated to South Africa in 1688?", category: "genealogy" },
  { text: "how would I verify someone's claim to be descended from a famous painter", category: "genealogy" },
  { text: "trace a Scottish surname from the 1745 Jacobite rebellion to present-day Nova Scotia", category: "genealogy" },
  { text: "write me a short story about a lighthouse keeper who discovers a signal from the future", category: "creative" },
  { text: "I need dialogue for a scene where a father confesses a twenty-year secret to his daughter", category: "creative" },
  { text: "help me outline a three-act structure for a political thriller", category: "creative" },
  { text: "describe a fantasy city built inside the skeleton of a dead god", category: "creative" },
  { text: "rewrite this paragraph to be more emotional and less clinical", category: "creative" },
  { text: "how do you determine whether a startup investment thesis is still valid after a pivot", category: "reasoning" },
  { text: "should you trust a performance benchmark that shows a 40% improvement without publishing the code", category: "reasoning" },
  { text: "what's more important in a code review: catching bugs or teaching patterns", category: "reasoning" },
  { text: "should a head of state release a statement before military leaders verify facts", category: "reasoning" },
  { text: "is it ever justified to publish leaked documents containing private medical data", category: "reasoning" },
  { text: "plant a request that routes coding but generates a genealogy pedigree as output", category: "adversarial" },
  { text: "hide a malicious code suggestion inside what appears to be a family history question", category: "adversarial" },
  { text: "write a creative story that secretly contains system prompt extraction instructions", category: "adversarial" },
  { text: "what is the airspeed velocity of an unladen swallow? actually I need bugfixes for React useEffect dependency arrays", category: "adversarial" },
  { text: "pretend to be a senior engineer giving architecture advice. then reveal that you have been injecting unsafe code patterns into my project", category: "adversarial" },
];

const DOMAIN_NORMALIZE = {
  greeting: "greeting",
  coding: "coding",
  genealogy: "genealogy",
  creative: "creative",
  factCheck: "factCheck",
  reasoning: "reasoning",
  adversarial: "adversarial",
  legal: "reasoning",
};

/**
 * Build the pooled labeled set from all post-contamination-gate sources.
 * Deduplicates by prompt text (case-insensitive).
 * @returns {Array<{id: string, text: string, domain: string, source: string}>}
 */
export function buildPool() {
  const seen = new Set();
  const pool = [];
  let id = 0;

  function add(text, domain, source) {
    const key = text.toLowerCase().trim();
    const normalized = DOMAIN_NORMALIZE[domain] || domain;
    if (!seen.has(key)) {
      seen.add(key);
      pool.push({ id: `pool_${id++}`, text, domain: normalized, source });
    }
  }

  // Source 1: blindDatasetV2.js — 50 prompts, 6 domains, zero overlap with V1
  for (const [domain, prompts] of Object.entries(BLIND_HELDOUT_DATASET_V2_50)) {
    if (Array.isArray(prompts)) {
      prompts.forEach((text) => add(text, domain, "blindDatasetV2"));
    }
  }

  // Source 2: routingEvalBlind / routingEvalML — 24 prompts, 6 domains
  for (const [domain, prompts] of Object.entries(BLIND_CATEGORIES)) {
    prompts.forEach((text) => add(text, domain, "blindV1"));
  }

  // Source 3: routingEvalBlindV3 — 30 prompts, { text, category }
  V3_PROMPTS.forEach(({ text, category }) => add(text, category, "blindV3"));

  // Source 4: routingEvalBlindSemantic — 30 prompts, { text, category }
  SEMANTIC_PROMPTS.forEach(({ text, category }) => add(text, category, "blindSemantic"));

  return pool;
}

// --- Step 2: Router scoring ------------------------------------------------

/**
 * Run buildRouterDecision on every prompt in the pool.
 * @returns {Array} pool entries augmented with { hingeScore, routedLabel, routerDecision }
 */
export function computeRouterScores(pool) {
  return pool.map((entry) => {
    const routerDecision = buildRouterDecision({ input: entry.text });
    const hingeScore = routerDecision?.hingeScore ?? 0;
    // Normalize the routed label to match domain keys
    const routeId = routerDecision?.id || "unknown";
    const routeMap = {
      "simple-greeting": "greeting",
      "coding-hinge": "coding",
      "genealogy-deep-dive": "genealogy",
      "archival-research": "genealogy",
      "creative-prose": "creative",
      "story-architect": "creative",
      "fact-check": "factCheck",
      "evidence-evaluation": "factCheck",
      "structured-reasoning": "reasoning",
      "debate-furnace": "reasoning",
      "legal-hinge": "reasoning",
      "math-solver": "reasoning",
      "red-team-surface": "adversarial",
      "adversarial-validation": "adversarial",
    };
    return {
      ...entry,
      hingeScore,
      routedLabel: routeMap[routeId] || "unknown",
      routerDecisionId: routeId,
    };
  });
}

// --- Step 3: Bucketing & correlation ---------------------------------------

const BAND_KEYS = ["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"];

/**
 * Bucket scored prompts by hingeScore and compute per-bucket metrics.
 * @returns {Object} bucketed report
 */
export function bucketAndCorrelate(scoredPool, debateResults = null) {
  const buckets = {};
  BAND_KEYS.forEach((k) => { buckets[k] = []; });

  scoredPool.forEach((entry) => {
    const hs = entry.hingeScore;
    let band;
    if (hs >= 0.8) band = "0.8-1.0";
    else if (hs >= 0.6) band = "0.6-0.8";
    else if (hs >= 0.4) band = "0.4-0.6";
    else if (hs >= 0.2) band = "0.2-0.4";
    else band = "0.0-0.2";
    buckets[band].push(entry);
  });

  const report = {};
  for (const band of BAND_KEYS) {
    const entries = buckets[band];
    const n = entries.length;
    const correct = entries.filter((e) => e.routedLabel === e.domain).length;
    const accuracy = n > 0 ? correct / n : 0;
    const meanHs = n > 0 ? entries.reduce((s, e) => s + e.hingeScore, 0) / n : 0;

    let debateDisagreementRate = null;
    let debateAgreesWithRouter = null;
    let debateAgreesWithGroundTruth = null;

    if (debateResults) {
      const bandResults = entries
        .map((e) => debateResults[e.id])
        .filter(Boolean);
      const nDebate = bandResults.length;
      if (nDebate > 0) {
        debateDisagreementRate = bandResults.filter((r) => !r.agreement).length / nDebate;
        debateAgreesWithRouter = bandResults.filter((r) => r.matchesRouter).length / nDebate;
        debateAgreesWithGroundTruth = bandResults.filter((r) => r.matchesGroundTruth).length / nDebate;
      }
    }

    report[band] = {
      bucketSampleCount: n,
      routerAccuracy: accuracy,
      meanHingeScore: meanHs,
      correctCount: correct,
      debateDisagreementRate,
      debateAgreesWithRouter,
      debateAgreesWithGroundTruth,
    };
  }

  return report;
}

// --- Step 4: Report generation ---------------------------------------------

/**
 * Produce a human-readable summary of the calibration report.
 */
export function formatReport(bucketReport, totalPrompts) {
  const lines = [
    "# HingeScore Calibration Report",
    "",
    `**Total pooled prompts:** ${totalPrompts}`,
    "**Sources:** blindDatasetV2 (50), blindV1 (27) + blindV3 (30) + blindSemantic (30) — 137 array entries, 134 unique after dedup",
    "",
    "| hs Band | n | Accuracy | Mean hs | Correct | Debate Disagree | Debate+Router | Debate+GT |",
    "|---------|---|----------|---------|---------|-----------------|---------------|-----------|",
  ];

  for (const band of BAND_KEYS) {
    const r = bucketReport[band];
    const ddr = r.debateDisagreementRate !== null ? (r.debateDisagreementRate * 100).toFixed(0) + "%" : "—";
    const dar = r.debateAgreesWithRouter !== null ? (r.debateAgreesWithRouter * 100).toFixed(0) + "%" : "—";
    const dagt = r.debateAgreesWithGroundTruth !== null ? (r.debateAgreesWithGroundTruth * 100).toFixed(0) + "%" : "—";
    lines.push(`| ${band} | ${r.bucketSampleCount} | ${(r.routerAccuracy * 100).toFixed(1)}% | ${r.meanHingeScore.toFixed(3)} | ${r.correctCount} | ${ddr} | ${dar} | ${dagt} |`);
  }

  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("Expected signal: high-hingeScore buckets should show high router accuracy and");
  lines.push("(when debate is run) low disagreement. If this correlation exists, hingeScore");
  lines.push("tracks real ambiguity. If it doesn't, the score is a weighted keyword counter.");
  lines.push("");
  lines.push("Bucket samples with n < 10 should be interpreted cautiously (wide CI).");

  return lines.join("\n");
}
