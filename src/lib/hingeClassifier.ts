import { scanRedTeamInput } from "./redTeamScanner.js";
import trainedWeightsArtifact from "../../data/ml/ecs_weights.json" with { type: "json" };
import { UNCERTAINTY_TERMS, HIGH_STRUCTURE_TERMS } from "./routingConstants.js";

const CONDITIONAL_TERMS = ["if", "unless", "assuming", "given that", "provided that", "in case", "supposing"];
const COMPARISON_TERMS = ["compare", "versus", "vs", "weigh", "trade-off", "tradeoff", "difference", "better", "worse"];
const NEGATION_TERMS = ["not", "never", "without", "except", "neither", "nor", "lack", "lacking"];

const ADVERSARIAL_REPHRASE_PATTERNS: RegExp[] = [
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

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function countTermHits(textLower: string, termList: string[]): number {
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

export interface HingeFeatures {
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  f5: number;
  f6: number;
  f7: number;
  f8: number;
  raw: {
    wordCount: number;
    questionCount: number;
    uncertaintyHits: number;
    structureHits: number;
    conditionalHits: number;
    comparisonHits: number;
    negationHits: number;
    codeFences: number;
    markdownTables: number;
    urls: number;
  };
}

export function extractFeatures(prompt = ""): HingeFeatures {
  const text = String(prompt ?? "").trim();
  const textLower = text.toLowerCase();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const f1 = wordCount === 0 ? 0 : sigmoid((wordCount - 50) / 15);
  const questionCount = (text.match(/\?/g) || []).length;
  const f2 = Math.min(1.0, questionCount / (wordCount + 1));
  const uncertaintyHits = countTermHits(textLower, UNCERTAINTY_TERMS);
  const f3 = Math.min(1.0, uncertaintyHits / (wordCount + 1));
  const structureHits = countTermHits(textLower, HIGH_STRUCTURE_TERMS);
  const f4 = Math.min(1.0, structureHits / 3.0);
  const conditionalHits = countTermHits(textLower, CONDITIONAL_TERMS);
  const f5 = Math.min(1.0, conditionalHits / (wordCount + 1));
  const comparisonHits = countTermHits(textLower, COMPARISON_TERMS);
  const f6 = Math.min(1.0, comparisonHits / (wordCount + 1));
  const negationHits = countTermHits(textLower, NEGATION_TERMS);
  const f7 = Math.min(1.0, negationHits / (wordCount + 1));
  const codeFences = (text.match(/```/g) || []).length / 2;
  const markdownTables = (text.match(/\|.*\|/g) || []).length;
  const urls = (text.match(/https?:\/\/\S+/gi) || []).length;
  const f8 = Math.min(1.0, (codeFences * 0.4) + (markdownTables * 0.2) + (urls * 0.3));
  return {
    f1, f2, f3, f4, f5, f6, f7, f8,
    raw: { wordCount, questionCount, uncertaintyHits, structureHits, conditionalHits, comparisonHits, negationHits, codeFences, markdownTables, urls },
  };
}

export function computeDAS(catalogScores: number[] = []): number {
  if (!Array.isArray(catalogScores) || catalogScores.length === 0) {
    return 0.0;
  }
  const validScores = catalogScores.map((s) => Math.max(0, Number(s) || 0));
  const sum = validScores.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) {
    return 0.0;
  }
  const p = validScores.map((v) => v / sum);
  let entropy = 0.0;
  for (const pi of p) {
    if (pi > 0) {
      entropy -= pi * Math.log2(pi);
    }
  }
  const N = Math.max(2, validScores.length);
  const maxEntropy = Math.log2(N);
  const das = Math.min(1.0, Math.max(0.0, entropy / maxEntropy));
  return Number(das.toFixed(4));
}

export function computeAPS(prompt = ""): number {
  const text = String(prompt ?? "").trim();
  if (!text) return 0.0;
  const scanResult = scanRedTeamInput(text);
  let scanScore = 0.0;
  if (scanResult.score > 0) {
    scanScore = Math.min(1.0, scanResult.score / 100.0);
  }
  let regexHits = 0;
  for (const pattern of ADVERSARIAL_REPHRASE_PATTERNS) {
    if (pattern.test(text)) {
      regexHits++;
    }
  }
  const regexScore = Math.min(1.0, regexHits * 0.35);
  const aps = Math.min(1.0, Math.max(scanScore, regexScore));
  return Number(aps.toFixed(4));
}

export interface HingeWeights {
  w0: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  w5: number;
  w6: number;
  w7: number;
  w8: number;
  w_das: number;
  w_aps: number;
}

export const DEFAULT_WEIGHTS: HingeWeights = trainedWeightsArtifact?.weights || {
  w0: -0.8613, w1: 0.1239, w2: 0.0263, w3: 0.0058, w4: 0.034, w5: 0.003, w6: 0.0533, w7: 0.015, w8: 0.0, w_das: 1.9717, w_aps: 0.7372,
};

export interface HingeScoreResult {
  hs: number;
  cheapRouteConfidence: number;
  tier: string;
  hingeVector: {
    ecs: number;
    das: number;
    aps: number;
    features: HingeFeatures;
  };
}

export function computeHingeScore(prompt = "", catalogScores: number[] = [], customWeights: HingeWeights | null = null): HingeScoreResult {
  const weights = customWeights || DEFAULT_WEIGHTS;
  const features = extractFeatures(prompt);
  const das = computeDAS(catalogScores);
  const aps = computeAPS(prompt);
  const z =
    weights.w0 + weights.w1 * features.f1 + weights.w2 * features.f2 + weights.w3 * features.f3 +
    weights.w4 * features.f4 + weights.w5 * features.f5 + weights.w6 * features.f6 + weights.w7 * features.f7 +
    weights.w8 * features.f8 + weights.w_das * das + weights.w_aps * aps;
  const hs = Number(sigmoid(z).toFixed(4));
  const cheapRouteConfidence = Number((1.0 - hs).toFixed(4));
  let tier = "low";
  if (hs >= 0.80) tier = "ultra";
  else if (hs >= 0.55) tier = "high";
  else if (hs >= 0.30) tier = "medium";
  return {
    hs, cheapRouteConfidence, tier,
    hingeVector: {
      ecs: Number(sigmoid(z - weights.w_das * das - weights.w_aps * aps).toFixed(4)),
      das, aps, features,
    },
  };
}
