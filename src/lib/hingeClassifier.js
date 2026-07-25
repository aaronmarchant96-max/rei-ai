/**
 * Night Shift v3 — Unified Hinge Classifier
 * Pure JavaScript feature extractor & mathematical routing score engine.
 *
 * Implements Fortis et Liber principles:
 * - Fortis: Transparent hingeVector emitting f1..f8, DAS, APS.
 * - Liber: Pure JS, zero-dependency, bounded outputs [0.0, 1.0].
 */

import { scanRedTeamInput } from "./redTeamScanner.js";
import trainedWeightsArtifact from "../../data/ml/ecs_weights.json" with { type: "json" };

const UNCERTAINTY_TERMS = ["uncertain", "unclear", "missing", "unknown", "not sure", "unsure", "doubt", "uncertainty"];
const HIGH_STRUCTURE_TERMS = [
  "what am i missing",
  "what would change my mind",
  "what would make this wrong",
  "real hinge",
  "how do i know",
  "how reliable",
  "prove it wrong",
  "why is this uncertain",
  "what evidence",
  "what matters most",
];
const CONDITIONAL_TERMS = ["if", "unless", "assuming", "given that", "provided that", "in case", "supposing"];
const COMPARISON_TERMS = ["compare", "versus", "vs", "weigh", "trade-off", "tradeoff", "difference", "better", "worse"];
const NEGATION_TERMS = ["not", "never", "without", "except", "neither", "nor", "lack", "lacking"];

const ADVERSARIAL_REPHRASE_PATTERNS = [
  /ignore\s+(?:(?:all|the|your|any|prior|previous|above|existing)\s+)*(?:instructions?|rules?|prompts?|context|directives?|guidelines?|system)/i,
  /disregard\s+(?:(?:all|the|your|any|prior|previous|above|existing)\s+)*(?:instructions?|rules?|prompts?|context|directives?|guidelines?|system)/i,
  /pretend\s+(?:you are|you're|to be|that)/i,
  /act\s+(?:as if|like|as though|as a)/i,
  /your\s+(?:new|real|actual|true|updated)\s+(?:rules?|instructions?|purpose|goal|system)/i,
  /forget\s+(?:(?:all|the|your|any|prior|previous|above|existing)\s+)*(?:instructions?|rules?|training|context|guidelines?)/i,
  /you are now/i,
  /new\s+(?:persona|role|identity|mode|directive)/i,
  /override\s+(?:(?:your|the|all|these|existing)\s+)*(?:instructions?|rules?|system|guidelines?)/i,
  /jailbreak|DAN mode|developer mode|unrestricted mode/i,
];

/**
 * Computes Sigmoid activation: 1 / (1 + e^-x)
 */
export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Counts occurrences of terms in lowercased prompt.
 */
function countTermHits(textLower, termList) {
  let count = 0;
  for (const term of termList) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s|[.,!?;:])`, "i");
    if (regex.test(textLower)) {
      count++;
    }
  }
  return count;
}

/**
 * Extracts the 8 deterministic syntactic & lexical density features (f1..f8).
 * All returned values are bounded numbers.
 *
 * @param {string} prompt
 * @returns {object} { f1, f2, f3, f4, f5, f6, f7, f8, raw }
 */
export function extractFeatures(prompt = "") {
  const text = String(prompt ?? "").trim();
  const textLower = text.toLowerCase();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // f1: Sigmoid-scaled word count centered at 50 words with scale 15
  const f1 = wordCount === 0 ? 0 : sigmoid((wordCount - 50) / 15);

  // f2: Question mark density: question marks / (wordCount + 1)
  const questionCount = (text.match(/\?/g) || []).length;
  const f2 = Math.min(1.0, questionCount / (wordCount + 1));

  // f3: Uncertainty term density
  const uncertaintyHits = countTermHits(textLower, UNCERTAINTY_TERMS);
  const f3 = Math.min(1.0, uncertaintyHits / (wordCount + 1));

  // f4: High-structure clause count (scaled 0..1, maxed out at 3 hits)
  const structureHits = countTermHits(textLower, HIGH_STRUCTURE_TERMS);
  const f4 = Math.min(1.0, structureHits / 3.0);

  // f5: Conditional syntax density
  const conditionalHits = countTermHits(textLower, CONDITIONAL_TERMS);
  const f5 = Math.min(1.0, conditionalHits / (wordCount + 1));

  // f6: Comparative analysis verbs
  const comparisonHits = countTermHits(textLower, COMPARISON_TERMS);
  const f6 = Math.min(1.0, comparisonHits / (wordCount + 1));

  // f7: Negation density
  const negationHits = countTermHits(textLower, NEGATION_TERMS);
  const f7 = Math.min(1.0, negationHits / (wordCount + 1));

  // f8: Technical structural markers (code fences, markdown tables, URLs)
  const codeFences = (text.match(/```/g) || []).length / 2;
  const markdownTables = (text.match(/\|.*\|/g) || []).length;
  const urls = (text.match(/https?:\/\/\S+/gi) || []).length;
  const f8 = Math.min(1.0, (codeFences * 0.4) + (markdownTables * 0.2) + (urls * 0.3));

  return {
    f1,
    f2,
    f3,
    f4,
    f5,
    f6,
    f7,
    f8,
    raw: {
      wordCount,
      questionCount,
      uncertaintyHits,
      structureHits,
      conditionalHits,
      comparisonHits,
      negationHits,
      codeFences,
      markdownTables,
      urls,
    },
  };
}

/**
 * Computes Normalized Domain Ambiguity Score (DAS) across N domain match scores.
 * Uses Shannon Entropy normalized by log2(N) so DAS is strictly in [0.0, 1.0].
 *
 * @param {number[]} catalogScores - Array of match scores for fingerprints (default N=15)
 * @returns {number} DAS in range [0.0, 1.0]
 */
export function computeDAS(catalogScores = []) {
  if (!Array.isArray(catalogScores) || catalogScores.length === 0) {
    return 0.0;
  }

  // Filter non-negative numbers
  const validScores = catalogScores.map((s) => Math.max(0, Number(s) || 0));
  const sum = validScores.reduce((acc, v) => acc + v, 0);

  if (sum <= 0) {
    return 0.0; // Zero activity across all domains = zero ambiguity
  }

  // Calculate probabilities p_i
  const p = validScores.map((v) => v / sum);

  // Shannon Entropy: H(P) = -sum(p_i * log2(p_i))
  let entropy = 0.0;
  for (const pi of p) {
    if (pi > 0) {
      entropy -= pi * Math.log2(pi);
    }
  }

  // Maximum theoretical entropy for N categories is log2(N)
  const N = Math.max(2, validScores.length);
  const maxEntropy = Math.log2(N);

  // Bounded normalization: DAS in [0.0, 1.0]
  const das = Math.min(1.0, Math.max(0.0, entropy / maxEntropy));
  return Number(das.toFixed(4));
}

/**
 * Computes Adversarial Pressure Score (APS) in range [0.0, 1.0].
 * Combines redTeamScanner findings + 2-pass regex instruction override patterns.
 *
 * @param {string} prompt
 * @returns {number} APS in range [0.0, 1.0]
 */
export function computeAPS(prompt = "") {
  const text = String(prompt ?? "").trim();
  if (!text) return 0.0;

  // Step 1: Scan with redTeamScanner
  const scanResult = scanRedTeamInput(text);
  let scanScore = 0.0;
  if (scanResult.score > 0) {
    scanScore = Math.min(1.0, scanResult.score / 100.0);
  }

  // Step 2: Test 2-pass rephrase regex patterns
  let regexHits = 0;
  for (const pattern of ADVERSARIAL_REPHRASE_PATTERNS) {
    if (pattern.test(text)) {
      regexHits++;
    }
  }
  const regexScore = Math.min(1.0, regexHits * 0.35);

  // Combined score with ceiling at 1.0
  const aps = Math.min(1.0, Math.max(scanScore, regexScore));
  return Number(aps.toFixed(4));
}

/**
 * Trained weight vector loaded from data/ml/ecs_weights.json.
 * Fallback to baseline default weights if artifact missing.
 */
export const DEFAULT_WEIGHTS = trainedWeightsArtifact?.weights || {
  w0: -0.8613,
  w1: 0.1239,
  w2: 0.0263,
  w3: 0.0058,
  w4: 0.034,
  w5: 0.003,
  w6: 0.0533,
  w7: 0.015,
  w8: 0.0,
  w_das: 1.9717,
  w_aps: 0.7372,
};

/**
 * Computes the unified Hinge Complexity Score (HS) and transparent trace vector.
 *
 * @param {string} prompt - Raw prompt string
 * @param {number[]} catalogScores - Match scores across fingerprints for DAS
 * @param {object} customWeights - Optional trained weight override
 * @returns {object} { hs, cheapRouteConfidence, tier, hingeVector }
 */
export function computeHingeScore(prompt = "", catalogScores = [], customWeights = null) {
  const weights = customWeights || DEFAULT_WEIGHTS;

  const features = extractFeatures(prompt);
  const das = computeDAS(catalogScores);
  const aps = computeAPS(prompt);

  // Compute linear logit z
  const z =
    weights.w0 +
    weights.w1 * features.f1 +
    weights.w2 * features.f2 +
    weights.w3 * features.f3 +
    weights.w4 * features.f4 +
    weights.w5 * features.f5 +
    weights.w6 * features.f6 +
    weights.w7 * features.f7 +
    weights.w8 * features.f8 +
    weights.w_das * das +
    weights.w_aps * aps;

  // Hinge Complexity Score: HS = Sigmoid(z) ∈ [0.0, 1.0]
  const hs = Number(sigmoid(z).toFixed(4));

  // Corrected cheap route confidence mapping: CheapRouteConfidence = 1.0 - HS
  const cheapRouteConfidence = Number((1.0 - hs).toFixed(4));

  // Map HS to complexity tier
  let tier = "low";
  if (hs >= 0.80) {
    tier = "ultra";
  } else if (hs >= 0.55) {
    tier = "high";
  } else if (hs >= 0.30) {
    tier = "medium";
  }

  return {
    hs,
    cheapRouteConfidence,
    tier,
    hingeVector: {
      ecs: Number(sigmoid(z - weights.w_das * das - weights.w_aps * aps).toFixed(4)),
      das,
      aps,
      features,
    },
  };
}
