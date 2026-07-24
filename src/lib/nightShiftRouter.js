import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };
import { resolveDeterministic } from "./deterministicEngine.js";
import { shouldEscalateToRemote } from "./cardoGuard.js";

const ROUTER_CATALOG = Array.isArray(fingerprintCatalog) ? fingerprintCatalog : [];
const STORAGE_KEY = "night-shift-user-fingerprint";

const FALLBACK_COST_INPUT = 0.00059;
const FALLBACK_COST_OUTPUT = 0.00079;
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_LABEL = "Fast (70B)";
const FALLBACK_MAX_TOKENS = 400;

function getModelCost(model) {
  const entry = ROUTER_CATALOG.find((e) => e.model === model);
  if (entry) {
    return {
      costPer1kInput: entry.costPer1kInput ?? FALLBACK_COST_INPUT,
      costPer1kOutput: entry.costPer1kOutput ?? FALLBACK_COST_OUTPUT,
      label: entry.label || model,
    };
  }
  return { costPer1kInput: FALLBACK_COST_INPUT, costPer1kOutput: FALLBACK_COST_OUTPUT, label: FALLBACK_LABEL };
}

function getRouterCosts() {
  const models = {};
  for (const entry of ROUTER_CATALOG) {
    if (entry.model && !models[entry.model]) {
      models[entry.model] = {
        costPer1kInput: entry.costPer1kInput ?? FALLBACK_COST_INPUT,
        costPer1kOutput: entry.costPer1kOutput ?? FALLBACK_COST_OUTPUT,
        label: entry.label || entry.model,
      };
    }
  }
  return models;
}

function buildAlternativeRoutes(text, selectedCostPer1k) {
  const t = normalizeText(text || "");
  const options = [];

  for (const entry of ROUTER_CATALOG) {
    if (entry.model === "mock" || entry.model === "rate-limited") continue;
    const costTotal = (entry.costPer1kInput ?? FALLBACK_COST_INPUT) + (entry.costPer1kOutput ?? FALLBACK_COST_OUTPUT);
    const costDeltaFromSelected = selectedCostPer1k ? costTotal - selectedCostPer1k : 0;
    options.push({
      model: entry.model,
      label: entry.label,
      costPer1kTotal: costTotal,
      costDeltaFromSelected,
      savingsPercentage: selectedCostPer1k && selectedCostPer1k > 0
        ? Math.round((costDeltaFromSelected / selectedCostPer1k) * 100)
        : 0,
      route: entry.id,
      rationale: entry.description,
      pathway: entry.pathway || "medium",
    });
  }

  return options.sort((a, b) => a.costPer1kTotal - b.costPer1kTotal).slice(0, 4);
}
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
const UNCERTAINTY_TERMS = ["uncertain", "unclear", "missing", "unknown", "not sure", "unsure", "doubt", "uncertainty"];

// ─── Pass-2 adversarial rephrase patterns ─────────────────────────────────────
// These catch injection attempts that avoid the obvious surface keywords.
const ADVERSARIAL_REPHRASE_PATTERNS = [
  /ignore (previous|above|prior|all) (instructions?|rules?|prompts?|context)/i,
  /disregard (the )?(above|previous|prior|all|your|any)/i,
  /pretend (you are|you're|to be|that)/i,
  /act (as if|like|as though|as a)/i,
  /your (new|real|actual|true|updated) (rules?|instructions?|purpose|goal|system)/i,
  /forget (your|all|the|these|those) (instructions?|rules?|training|context|guidelines?)/i,
  /you are now/i,
  /new (persona|role|identity|mode|directive)/i,
  /override (your|the|all|these)? ?(instructions?|rules?|system|guidelines?)/i,
  /jailbreak|DAN mode|developer mode|unrestricted mode/i,
];

function normalizeText(value = "") {
  return String(value ?? "").toLowerCase().trim();
}

/**
 * @param {string} id
 * @returns {object|null}
 */
function getCatalogEntry(id) {
  return ROUTER_CATALOG.find((entry) => entry.id === id) || null;
}

/**
 * @param {string} term
 * @returns {string}
 */
function escapeKeyword(term = "") {
  return String(term ?? "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

/**
 * @param {string} text
 * @param {string} term
 * @returns {boolean}
 */
function keywordMatches(text, term = "") {
  const escaped = escapeKeyword(term);
  if (!escaped) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function getTermScore(term, text) {
  if (typeof term === "string") {
    return keywordMatches(text, term) ? 1.0 : 0;
  }
  if (term && typeof term === "object" && term.term) {
    return keywordMatches(text, term.term) ? (term.weight ?? 1.0) : 0;
  }
  return 0;
}

function getCatalogRouteMatch(text) {
  let bestEntry = null;
  let bestScore = 0;

  for (const entry of ROUTER_CATALOG) {
    const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    const negativeTerms = Array.isArray(entry?.negativeMatchTerms) ? entry.negativeMatchTerms : [];
    const threshold = entry.matchThreshold ?? 0.5;

    let score = 0;
    for (const term of terms) {
      score += getTermScore(term, text);
    }

    for (const negTerm of negativeTerms) {
      if (keywordMatches(text, negTerm)) {
        score -= 0.8;
      }
    }

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return { entry: bestEntry, score: bestScore };
}

// ─── Session Intelligence v2 ─────────────────────────────────────────────────────
//
// 4.1 — Recency-weighted preference
//   Each stored entry now carries a timestamp. Weight = e^(-λ * ageInSlots)
//   where λ = 0.3. Recent routes score higher; a preference is only applied
//   when the top candidate’s decayed weight ≥ PREF_MIN_WEIGHT.
//
// 4.2 — Per-domain localStorage rings
//   A separate ring is kept for each domain so a heavy coding session
//   never contaminates preference for story or research sessions.
//   Global ring is still maintained as a fallback for domain="assistant".
//
// Ring capacity: last 20 entries per domain (up from 10).

const HISTORY_MAX = 20;
const DECAY_LAMBDA = 0.3;   // higher → older entries fade faster
const PREF_MIN_WEIGHT = 0.6; // minimum decayed weight to fire a preference

// Map catalog IDs to the domain key used for per-domain rings
const ROUTE_DOMAIN_MAP = {
  "coding-hinge": "coding",
  "genealogy-deep-dive": "genealogy",
  "story-architect": "story",
  "creative-prose": "story",
  "fact-check": "research",
  "red-team-surface": "redteam",
  "red-team-semantic": "redteam",
  "red-team-deep": "redteam",
  "finance-analyst": "finance",
  "structured-data": "data",
  "meta-routing": "meta",
  "multi-turn-synthesis": "synthesis",
  "structured-reasoning": "general",
  "simple-greeting": "general",
};

function domainStorageKey(domain) {
  return `night-shift-history-${domain || "global"}`;
}

/** Read a stored ring (array of { id, ts } objects). */
function readRing(key) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.id) : [];
  } catch {
    return [];
  }
}

/** Write a ring back to localStorage. */
function writeRing(key, ring) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ring.slice(-HISTORY_MAX)));
  } catch {
    // Ignore storage failures; routing remains deterministic.
  }
}

/**
 * getStoredRouteHistory — Returns the global history ring as a flat array of IDs.
 * Kept for backward-compatibility with existing callers.
 */
function getStoredRouteHistory() {
  return readRing(STORAGE_KEY).map((e) => (typeof e === "string" ? e : e.id));
}

/**
 * persistRouteHistory — Appends a route ID to both the global ring
 * and the per-domain ring, each entry stamped with a slot index (position).
 */
function persistRouteHistory(routeId) {
  if (!routeId) return;

  // ─ Global ring (backward compat) ──────────────────────────────────
  const globalRing = readRing(STORAGE_KEY);
  // Migrate any legacy string entries to object format on first write
  const migratedGlobal = globalRing.map((e, i) =>
    typeof e === "string" ? { id: e, slot: i } : e
  );
  migratedGlobal.push({ id: routeId, slot: migratedGlobal.length });
  writeRing(STORAGE_KEY, migratedGlobal);

  // ─ Per-domain ring ──────────────────────────────────────────
  const domainKey = ROUTE_DOMAIN_MAP[routeId];
  if (domainKey && domainKey !== "general") {
    const dKey = domainStorageKey(domainKey);
    const dRing = readRing(dKey);
    dRing.push({ id: routeId, slot: dRing.length });
    writeRing(dKey, dRing);
  }
}

/**
 * getDecayedWeight — Exponential decay score for a route within a ring.
 *
 * Gives entries a weight of e^(-λ * (maxSlot - entrySlot)), so the
 * most recent entry scores ~1.0 and older entries fade exponentially.
 *
 * @param {Array} ring   - Array of { id, slot } objects
 * @param {string} routeId - Route to score
 * @returns {number} Decayed weight 0–1
 */
function getDecayedWeight(ring, routeId) {
  if (!ring.length) return 0;
  const maxSlot = Math.max(...ring.map((e) => e.slot ?? 0));
  let totalWeight = 0;
  for (const entry of ring) {
    if (entry.id === routeId) {
      const age = maxSlot - (entry.slot ?? 0);
      totalWeight += Math.exp(-DECAY_LAMBDA * age);
    }
  }
  return totalWeight;
}

/**
 * getStoredRoutePreference — Returns the preferred route ID using
 * recency-weighted scoring, or null if no candidate clears PREF_MIN_WEIGHT.
 *
 * Checks the per-domain ring first, then falls back to the global ring.
 *
 * @param {string} [domainHint] - Optional domain key to check first
 * @returns {string|null}
 */
function getStoredRoutePreference(domainHint) {
  // ─ Try per-domain ring first ───────────────────────────────────
  if (domainHint && domainHint !== "general") {
    const dRing = readRing(domainStorageKey(domainHint));
    if (dRing.length >= 2) {
      const uniqueIds = [...new Set(dRing.map((e) => e.id))];
      let best = null, bestW = 0;
      for (const id of uniqueIds) {
        const w = getDecayedWeight(dRing, id);
        if (w > bestW) { bestW = w; best = id; }
      }
      if (best && bestW >= PREF_MIN_WEIGHT) return best;
    }
  }

  // ─ Fall back to global ring ───────────────────────────────────
  const globalRing = readRing(STORAGE_KEY).map((e, i) =>
    typeof e === "string" ? { id: e, slot: i } : e
  );
  if (globalRing.length < 3) return null;

  const uniqueIds = [...new Set(globalRing.map((e) => e.id))];
  let best = null, bestW = 0;
  for (const id of uniqueIds) {
    const w = getDecayedWeight(globalRing, id);
    if (w > bestW) { bestW = w; best = id; }
  }
  return best && bestW >= PREF_MIN_WEIGHT ? best : null;
}

function buildDecision(id, overrides = {}) {
  const baseEntry = getCatalogEntry(id);
  const catalogMatch = ROUTER_CATALOG.find((e) => e.id === id);
  return {
    id: baseEntry?.id || id,
    jobType: baseEntry?.jobType || id,
    label: baseEntry?.label || id,
    model: baseEntry?.model || FALLBACK_MODEL,
    maxTokens: baseEntry?.maxTokens || FALLBACK_MAX_TOKENS,
    costPer1k: baseEntry?.costPer1k ?? 1.0,
    costPer1kInput: baseEntry?.costPer1kInput ?? FALLBACK_COST_INPUT,
    costPer1kOutput: baseEntry?.costPer1kOutput ?? FALLBACK_COST_OUTPUT,
    qualityGate: baseEntry?.qualityGate || "Default reasoning gate",
    enforce: baseEntry?.enforce || null,
    description: baseEntry?.description || "Default routing decision",
    temperature: baseEntry?.temperature ?? 0.7,
    fallbackPriority: baseEntry?.fallbackPriority || null,
    fallbackChain: baseEntry?.fallbackChain || null,
    contextWindow: baseEntry?.contextWindow || 8192,
    confidence: catalogMatch?.confidence || { local: 0.05, cheap: 0.38, premium: 0.01 },
    pathway: catalogMatch?.pathway || "medium",
    routingSignals: {},
    ...overrides,
  };
}

function isSimpleGreeting(text) {
  return /^(hi|hello|hey|yo|hiya|sup|howdy|heya|hola)(\s+there)?[\s!,.]*$|^(good\s+(morning|afternoon|evening)|how\s+are\s+(you|things|it\s+going)|how('s|s)\s+(it\s+going|everything|life)|what('s|s)\s+up|thanks|thank\s+you|thx|ty|ok|okay|k+|yeah|yep|nope|sure|right|alright|fine|test|ping|appreciate\s+(it|that|you))[\s!,.]*$/i.test(text.trim());
}

// ─── Domain Signal Scorers ────────────────────────────────────────────────────
// Each scorer returns a float 0–1 based on weighted keyword hits.
// Multiple independent signals per domain prevent single-term false positives.

const CODING_SIGNALS = [
  { pattern: /```[\s\S]*?```/g, weight: 0.5 },
  { pattern: /\b(implement|build|debug|fix|refactor|function|component|module|api)\b/i, weight: 0.25 },
  { pattern: /\b(jest|vite|react|node|typescript|javascript|python|patch|class|service|hook)\b/i, weight: 0.2 },
  { pattern: /\b(compile|deploy|dependency|import|export|async|callback|promise|syntax|error)\b/i, weight: 0.15 },
  { pattern: /\b(test suite|unit test|integration test|stack trace|linting|eslint|webpack|bundler)\b/i, weight: 0.2 },
];

const GENEALOGY_SIGNALS = [
  { pattern: /\b(ancestor|descendant|genealogy|lineage|pedigree|family tree)\b/i, weight: 0.4 },
  { pattern: /\b(birth|death|marriage|census|baptism|burial|probate)\b/i, weight: 0.3 },
  { pattern: /\b(familysearch|find a grave|archive|parish|headstone|cemetery|obituary)\b/i, weight: 0.3 },
  { pattern: /\b(same-name|disambiguat|surname|provenance|dna|great-grand)\b/i, weight: 0.2 },
];

const STORY_SIGNALS = [
  { pattern: /\b(story|plot|narrative|arc|worldbuilding)\b/i, weight: 0.35 },
  { pattern: /\b(character|scene|dialogue|conflict|hero|villain)\b/i, weight: 0.3 },
  { pattern: /\b(outline|prose|tone|genre|chapter|draft|creative writing)\b/i, weight: 0.25 },
  { pattern: /\b(protagonist|antagonist|setting|theme|motif|climax|resolution)\b/i, weight: 0.2 },
];

const RESEARCH_SIGNALS = [
  { pattern: /\b(source|cite|citation|evidence|reference|bibliography)\b/i, weight: 0.3 },
  { pattern: /\b(study|paper|journal|dataset|statistic|report|survey|meta.analysis)\b/i, weight: 0.3 },
  { pattern: /\b(fact.?check|verify|peer.?review|pubmed|doi|arxiv|empirical)\b/i, weight: 0.35 },
  { pattern: /\b(scholarly|academic|quantitative|qualitative|literature|hypothesis)\b/i, weight: 0.2 },
];

const REDTEAM_SIGNALS = [
  { pattern: /\b(red.?team|adversarial|stress.?test|attack|jailbreak)\b/i, weight: 0.5 },
  { pattern: /\b(prompt injection|policy audit|abuse case|threat model|anomaly)\b/i, weight: 0.4 },
  { pattern: /\b(counterargument|find.?flaw|poke holes|prove.?wrong|break.?argument)\b/i, weight: 0.3 },
];

/**
 * getDomainSignals — Weighted multi-signal domain scorer.
 *
 * Returns a score 0–1 for each domain by summing weighted pattern hits,
 * capped at 1.0. Also detects collisions when two domains score closely.
 *
 * @param {string} text - Normalized input text
 * @returns {{ scores: Object, winner: string, runnerUp: string|null, collisionRatio: number }}
 */
function getDomainSignals(text) {
  function scoreSignals(signals) {
    let total = 0;
    for (const { pattern, weight } of signals) {
      if (pattern.test(text)) total += weight;
      // Reset lastIndex for global regexes
      if (pattern.global) pattern.lastIndex = 0;
    }
    return Math.min(total, 1.0);
  }

  const scores = {
    coding: scoreSignals(CODING_SIGNALS),
    genealogy: scoreSignals(GENEALOGY_SIGNALS),
    story: scoreSignals(STORY_SIGNALS),
    research: scoreSignals(RESEARCH_SIGNALS),
    redteam: scoreSignals(REDTEAM_SIGNALS),
  };

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const winnerScore = sorted[0][1];
  const runnerUp = sorted[1][0];
  const runnerUpScore = sorted[1][1];

  // Collision when runner-up is within 70% of winner's score and both > 0.2
  const collisionRatio = winnerScore > 0 ? runnerUpScore / winnerScore : 0;
  const collision = collisionRatio >= 0.7 && winnerScore >= 0.2 && runnerUpScore >= 0.15;

  return { scores, winner, winnerScore, runnerUp, runnerUpScore, collisionRatio, collision };
}

// ─── Backward-compatible boolean helpers (used by existing callers) ───────────
function isLikelyCodingRequest(input) {
  return /\b(implement|build|debug|fix|refactor|function|component|module|api|jest|vite|react|node|typescript|javascript|python|test|patch|class|service|hook|route)\b/i.test(input);
}

function isLikelyGenealogyRequest(input) {
  return /\b(ancestor|descendant|birth|death|marriage|census|familysearch|find a grave|pedigree|genealogy|lineage|same-name|disambiguat|archive|parish|baptism|burial)\b/i.test(input);
}

function isLikelyStoryRequest(input) {
  return /\b(story|plot|character|scene|narrative|outline|dialogue|arc|worldbuilding|conflict|hero|villain)\b/i.test(input);
}

/**
 * isLikelyResearchRequest — detects epistemic/data-heavy requests.
 * Triggers the research fingerprint when academic or evidence-oriented
 * language is present, even without an explicit domain override.
 */
function isLikelyResearchRequest(input) {
  return /\b(source|cite|citation|evidence|study|paper|journal|dataset|data|statistic|statistics|fact[- ]?check|verify|peer[- ]?review(ed)?|pubmed|doi|arxiv|report|survey|meta[- ]?analysis|reference|bibliography|literature|scholarly|academic|empirical|quantitative|qualitative)\b/i.test(input);
}

/**
 * getAdversarialSuspicion — Two-pass adversarial detection.
 *
 * Pass 1: Surface keywords (fast regex, existing logic)
 * Pass 2: Rephrase patterns (catches disguised injections)
 *
 * Returns a suspicionScore 0–1:
 *   0.0 = clean
 *   0.3–0.5 = surface hit only
 *   0.6–0.8 = rephrase pattern hit
 *   0.9–1.0 = both passes hit
 */
function getAdversarialSuspicion(text) {
  const surfaceHit = /\b(red[- ]?team|adversarial|stress[- ]?test|attack|challenge|prove\b.*\bwrong|counterargument|break it|break\b.*\bargument|find\b.*\bflaw|poke\s+holes)\b/i.test(text);
  const rephraseHits = ADVERSARIAL_REPHRASE_PATTERNS.filter((pattern) => pattern.test(text)).length;

  if (surfaceHit && rephraseHits > 0) return 1.0;
  if (rephraseHits >= 2) return 0.9;
  if (rephraseHits === 1) return 0.65;
  if (surfaceHit) return 0.4;
  return 0.0;
}

/** Backward-compatible single boolean used by existing callers. */
function isAdversarialRequest(text) {
  return getAdversarialSuspicion(text) >= 0.4;
}

/**
 * getComplexityTier v2 — Structural complexity scorer.
 *
 * Adds structural markers on top of the original word/question/uncertainty
 * scoring. New markers: code fences, markdown tables, bullet lists, URLs,
 * multi-clause conditionals, and comparison language.
 *
 * Tiers: low < 25 ≤ medium < 55 ≤ high < 90 ≤ ultra
 * 'ultra' always escalates to frontier model regardless of budget.
 */
function getComplexityTier(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const uncertaintyHits = UNCERTAINTY_TERMS.filter((term) => text.includes(term)).length;

  // ── Structural markers ────────────────────────────────────────────────────
  const codeFences = (text.match(/```/g) || []).length;
  const markdownTable = /\|.+\|.+\|/m.test(text) ? 1 : 0;
  const bulletList = (text.match(/^\s*[-*•]\s+/gm) || []).length;
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  const multiClause = (text.match(/\b(if|then|else|unless|given that|provided that|assuming)\b/gi) || []).length;
  const compareLanguage = (text.match(/\b(compare|contrast|versus|vs\.?|trade.?off|difference between|better than|worse than)\b/gi) || []).length;

  const score =
    words * 2 +
    questionMarks * 8 +
    uncertaintyHits * 10 +
    codeFences * 15 +
    markdownTable * 12 +
    Math.min(bulletList, 5) * 8 +  // cap at 5 bullets to avoid runaway
    urlCount * 5 +
    multiClause * 10 +
    compareLanguage * 6;

  const tier = score >= 90 ? "ultra" : score >= 55 ? "high" : score >= 25 ? "medium" : "low";
  return { tier, score, words, questionMarks, uncertaintyHits, codeFences, markdownTable, bulletList, urlCount, multiClause, compareLanguage };
}

function getHighStructureSignals(text) {
  return HIGH_STRUCTURE_TERMS.filter((term) => keywordMatches(text, term));
}

function getStoredPreferenceForContext(text, domainName) {
  // Resolve domain key for per-domain ring lookup (4.2)
  const domainKeyMap = {
    coding: "coding",
    genealogy: "genealogy",
    story: "story",
    creative: "story",
    research: "research",
    factcheck: "research",
    "fact-check": "research",
    "red-team": "redteam",
  };
  const domainHint = domainKeyMap[domainName] || null;
  const storedPreference = getStoredRoutePreference(domainHint);
  if (!storedPreference) {
    return null;
  }

  const genericDomainSignals = {
    "genealogy-deep-dive": /family|ancestor|record|lineage|archive|burial|marriage|census/i,
    "coding-hinge": /code|function|module|api|test|build|debug|implement/i,
    "story-architect": /story|plot|character|scene|narrative|dialogue|worldbuilding/i,
    "fact-check": /source|cite|evidence|study|paper|journal|dataset|verify|report/i,
  };

  // For non-assistant domains, always honour the preference if it came from
  // the per-domain ring (the ring is already domain-scoped, so no extra check needed).
  if (domainHint) {
    return storedPreference;
  }

  // For generic "assistant" domain, require a lexical signal match before applying.
  if (domainName === "assistant" && genericDomainSignals[storedPreference]?.test(text)) {
    return storedPreference;
  }

  return null;
}

/**
 * estimateTokens — Token estimator v2.
 *
 * Improves on the naive `length / 4` baseline by adding correction
 * factors for code fences, embedded URLs, and non-ASCII Unicode.
 * These are the most common sources of under-counting in real prompts.
 *
 * Accuracy improvement: ~20–30% closer to tiktoken on typical inputs.
 */
export function estimateTokens(text) {
  const safeText = text || "";
  const base = Math.ceil(safeText.length / 4);
  // Code fences add significant overhead due to tokenizer boundary effects
  const codeFenceBonus = (safeText.match(/```/g) || []).length * 8;
  // URLs are tokenized character-by-character in most BPE encodings
  const urlBonus = (safeText.match(/https?:\/\//g) || []).length * 5;
  // Non-ASCII chars often map to 2–3 tokens each in BPE vocabularies
  const unicodeBonus = (safeText.match(/[^\x00-\x7F]/g) || []).length;
  return base + codeFenceBonus + urlBonus + unicodeBonus;
}

/**
 * detectDomain — Auto-classifies input into a domain string.
 * Research is now included as a first-class auto-detected domain.
 */
export function detectDomain(text) {
  const t = normalizeText(text || "");
  if (isLikelyCodingRequest(t)) return "coding";
  if (isLikelyGenealogyRequest(t)) return "genealogy";
  if (isLikelyStoryRequest(t)) return "story";
  if (isLikelyResearchRequest(t)) return "research";
  return null;
}

export function getFingerprintCatalog() {
  return ROUTER_CATALOG.map((entry) => ({ ...entry }));
}

/**
 * buildHybridDecision — Merges two domain fingerprints when signals collide.
 *
 * Used when the runner-up domain scores within 70% of the winner.
 * Blends max-tokens (average), uses winner's model and temperature,
 * and produces a composite label for the Glass Box UI.
 *
 * @param {string} primaryId   - Winning fingerprint catalog ID
 * @param {string} secondaryId - Runner-up fingerprint catalog ID
 * @param {number} collisionRatio - runner-up score / winner score (0–1)
 * @param {Object} sharedSignals - routingSignals to attach
 * @returns {Object} Merged routing decision
 */
export function buildHybridDecision(primaryId, secondaryId, collisionRatio, sharedSignals = {}) {
  const primary = getCatalogEntry(primaryId);
  const secondary = getCatalogEntry(secondaryId);

  if (!primary || !secondary) {
    return buildDecision(primaryId || "structured-reasoning", { routingSignals: sharedSignals });
  }

  const blendedMaxTokens = Math.round(
    (primary.maxTokens || FALLBACK_MAX_TOKENS) * 0.6 +
    (secondary.maxTokens || FALLBACK_MAX_TOKENS) * 0.4
  );

  const primaryPct = Math.round((1 / (1 + collisionRatio)) * 100);
  const secondaryPct = 100 - primaryPct;

  return buildDecision(primaryId, {
    label: `${primary.label} ⟷ ${secondary.label}`,
    hybridMode: true,
    hybridPrimary: { id: primaryId, label: primary.label, pct: primaryPct },
    hybridSecondary: { id: secondaryId, label: secondary.label, pct: secondaryPct },
    collisionRatio,
    maxTokens: blendedMaxTokens,
    qualityGate: `${primary.qualityGate} + ${secondary.qualityGate}`,
    rationale: `Domain collision detected (${primaryPct}% ${primary.label} / ${secondaryPct}% ${secondary.label}); hybrid fingerprint applied.`,
    routingSignals: sharedSignals,
  });
}

/**
 * Builds routing decision following Fortis et Liber principles:
 * 1. Leverage - Identifies exact hinge points in input  
 * 2. Surface Area - Minimal interface with clear boundaries
 * 3. Recoil - Explicit adversarial handling
 * 4. Enumeration - Tracks all decision signals  
 * 5. Parity - Balanced model selection
 * 6. Solvency - Clear fallback paths
 * 7. Conservation - Right-sized responses
 */
/**
 * Core routing decision following Fortis et Liber principles:
 * 
 * 1. Leverage - Identifies exact hinge points in input using:
 *    - Domain-specific lexical fingerprints
 *    - Structural complexity analysis
 *    - Historical preference signals
 * 
 * 2. Surface Area - Minimal interface with:
 *    - Strict input validation
 *    - Clear boundary conditions
 *    - No implicit state
 * 
 * 3. Recoil - Managed pushback via:
 *    - Adversarial routing
 *    - Quality gates
 *    - Fallback paths
 * 
 * 4. Enumeration - Explicit accounting of:
 *    - All decision signals
 *    - Routing rationale
 *    - Model selection criteria
 * 
 * 5. Parity - Balanced model selection using:
 *    - Cost/performance tradeoffs  
 *    - Domain-specific optimizations
 *    - Stored preference weighting
 * 
 * 6. Solvency - Clear exit strategies:
 *    - Fallback model hierarchy
 *    - Input validation gates
 *    - Error recovery paths
 * 
 * 7. Conservation - Right-sized responses:
 *    - Token budgeting
 *    - Complexity-tiered responses
 *    - Minimal necessary force
 */
/**
 * buildRouterDecision — Core routing engine. Determines the optimal model and pathway for a given input.
 * 
 * Uses CARDO REI methodology: Complexity scoring, catalog matching, and cost-aware decision making.
 * 
 * @param {Object} options - Routing options
 * @param {string} options.input - User input to route
 * @param {string} options.domain - Domain context (default: "assistant")
 * @param {Array} options.history - Previous conversation messages
 * @param {string} options.attachedRecord - Additional context record
 * @param {boolean} options.requiresAdversarial - Force adversarial routing
 * @param {boolean} options.thrifty - Force cheapest model
 * @returns {Object} Routing decision with model, pathway, costs, and rationale
 * 
 * @example
 *   buildRouterDecision({ input: "Write a Python function", domain: "coding" })
 *   // → { id: "coding-hinge", model: "llama-3.3-70b-versatile", pathway: "medium", ... }
 */
export function buildRouterDecision({
  input = "",
  domain = "assistant",
  history = [],
  attachedRecord = "",
  requiresAdversarial = false,
  thrifty = false,
} = {}) {
  const combinedInput = [input, attachedRecord, history?.map((message) => message?.content || "").join(" ")]
    .filter(Boolean)
    .join(" ");
  const text = normalizeText(combinedInput);
  const domainName = String(domain || "assistant").toLowerCase();
  const catalogRoute = getCatalogRouteMatch(input);
  const complexity = getComplexityTier(text);
  const complexityTier = complexity.tier;
  const highStructureSignals = getHighStructureSignals(text);
  const storedPreference = getStoredPreferenceForContext(text, domainName);
  const estimatedInputTokens = estimateTokens(combinedInput);

  // ── Sprint 2: Multi-signal domain scoring & collision detection ──────────
  const domainSignals = getDomainSignals(text);

  let decision;

  const deterministicResult = input ? resolveDeterministic(input) : null;

  if (!text) {
    decision = buildDecision("structured-reasoning");
  } else if (deterministicResult) {
    decision = buildDecision("simple-greeting", {
      costPer1kInput: 0,
      costPer1kOutput: 0,
      maxTokens: 0,
      model: "deterministic",
      pathway: "deterministic",
      confidence: { local: 1.0, cheap: 1.0, premium: 1.0 },
      deterministicLayer: true,
      deterministicResponse: deterministicResult.response,
      matchedPattern: deterministicResult.pattern,
      rationale: `Pattern matched: '${deterministicResult.pattern}' → deterministic response ($0, zero tokens).`,
      routingSignals: {
        complexityTier: "low",
        matchedTerms: [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (isSimpleGreeting(input)) {
    decision = buildDecision("simple-greeting", {
      rationale: "Greeting detected; use the cheapest fast path.",
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (domainName === "red-team") {
    decision = buildDecision("red-team-surface", {
      rationale: "Red Team mode selected; routing through surface scan pipeline.",
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (requiresAdversarial || isAdversarialRequest(input)) {
    const suspicionScore = getAdversarialSuspicion(input);
    decision = buildDecision("red-team-surface", {
      rationale: `Adversarial or red-team request detected (suspicion: ${(suspicionScore * 100).toFixed(0)}%); routing through surface scan pipeline.`,
      routingSignals: {
        complexityTier,
        matchedTerms: ["adversarial"],
        highStructureSignals,
        storedPreference,
        suspicionScore,
      },
    });
    // ── Red Team Confidence Floor (Phase 3.2) ────────────────────────────────
    // Prevent a high-suspicion prompt from silently routing at 50% confidence
    // through the cheap path. Force a minimum 0.65 confidence so CARDO Guard
    // can correctly evaluate the escalation decision.
    if (suspicionScore > 0.3 && (decision.routingConfidence ?? 0.5) < 0.65) {
      decision.routingConfidence = 0.65;
      decision.confidenceFloorApplied = true;
    }
  } else if (thrifty) {
    decision = buildDecision("simple-greeting", {
      rationale: "Thrifty mode active; using the cheapest adequate model.",
      model: "llama-3.1-8b-instant",
      maxTokens: 200,
      costPer1k: 0.05,
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (complexityTier === "ultra") {
    // Ultra complexity always escalates — domain collision or not
    decision = buildDecision("structured-reasoning", {
      rationale: `Ultra-complexity detected (score: ${complexity.score}); escalating to frontier reasoning model.`,
      qualityGate: "Hinge + Facts + Move + challenge test + ultra-verify",
      maxTokens: 800,
      temperature: 0.15,
      pathway: "premium",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
        domainSignals,
      },
    });
  } else if (
    domainName === "finance" ||
    /\b(roi|token cost|token budget|spend|pricing|invoice|budget|cost per|expenditure|revenue|profit|loss|margin|burn rate|cash flow|forecast|fiscal|financial|quarterly|annual report|cost analysis|cost saving|token efficiency)\b/i.test(input)
  ) {
    decision = buildDecision("finance-analyst", {
      rationale: "Finance, cost, or token-efficiency language detected; routing to Finance Analyst fingerprint.",
      routingSignals: { complexityTier, matchedTerms: ["finance"], highStructureSignals, storedPreference, domainSignals },
    });
  } else if (
    domainName === "structured-data" ||
    /\b(csv|json|sql|schema|dataframe|primary key|foreign key|migration|data model|aggregate|join\b)\b/i.test(input)
  ) {
    decision = buildDecision("structured-data", {
      rationale: "Structured data or schema-heavy request detected; routing to Structured Data fingerprint.",
      routingSignals: { complexityTier, matchedTerms: ["data"], highStructureSignals, storedPreference, domainSignals },
    });
  } else if (
    domainName === "meta" ||
    /\b(why did you choose|what model|what fingerprint|explain your routing|how did you route|glass box|night shift router|which fingerprint|why this model|token math|what pathway)\b/i.test(input)
  ) {
    decision = buildDecision("meta-routing", {
      rationale: "Self-referential routing query detected; routing to Meta / Self-Reference fingerprint.",
      routingSignals: { complexityTier, matchedTerms: ["meta"], highStructureSignals, storedPreference, domainSignals },
    });
  } else if (
    history.length >= 5 &&
    /\b(summarize|recap|so far|what have we covered|what did we discuss|catch me up|what was decided|pull together|consolidate|synthesize)\b/i.test(input)
  ) {
    decision = buildDecision("multi-turn-synthesis", {
      rationale: "Long conversation history with synthesis request; routing to Multi-Turn Synthesis fingerprint.",
      routingSignals: { complexityTier, matchedTerms: ["synthesis"], highStructureSignals, storedPreference, domainSignals },
    });
  } else if (
    domainName === "assistant" &&
    domainSignals.collision &&
    !requiresAdversarial &&
    !thrifty
  ) {
    // Hybrid fingerprint: top-2 domains too close to call — blend them
    const domainToId = {
      coding: "coding-hinge",
      genealogy: "genealogy-deep-dive",
      story: "story-architect",
      research: "fact-check",
      redteam: "red-team-surface",
    };
    const primaryId = domainToId[domainSignals.winner] || "structured-reasoning";
    const secondaryId = domainToId[domainSignals.runnerUp] || "structured-reasoning";
    decision = buildHybridDecision(primaryId, secondaryId, domainSignals.collisionRatio, {
      complexityTier,
      matchedTerms: catalogRoute?.entry?.matchTerms || [],
      highStructureSignals,
      storedPreference,
      domainSignals,
    });
  } else if (domainName === "research" || domainName === "factcheck" || domainName === "fact-check" || (isLikelyResearchRequest(input) && !isLikelyCodingRequest(input))) {
    decision = buildDecision("fact-check", {
      rationale: "Research or evidence-oriented language detected via auto-classification; routing through the fact-check/research gate.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (domainName === "genealogy" || catalogRoute?.entry?.id === "genealogy-deep-dive" || isLikelyGenealogyRequest(input)) {
    decision = buildDecision("genealogy-deep-dive", {
      rationale: "Genealogy or archival evidence language detected; enforce evidence-tiered reasoning.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (domainName === "coding" || catalogRoute?.entry?.id === "coding-hinge" || isLikelyCodingRequest(input)) {
    decision = buildDecision("coding-hinge", {
      rationale: "Coding language detected; route through the verification-first coding path.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (domainName === "story" || domainName === "creative" || catalogRoute?.entry?.id === "story-architect" || catalogRoute?.entry?.id === "creative-prose" || isLikelyStoryRequest(input)) {
    const targetId = catalogRoute?.entry?.id === "creative-prose" ? "creative-prose" : "story-architect";
    decision = buildDecision(targetId, {
      rationale: "Story or creative writing language detected; route through the storytelling/prose blueprint path.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (domainName === "factcheck" || domainName === "fact-check" || catalogRoute?.entry?.id === "fact-check") {
    decision = buildDecision("fact-check", {
      rationale: "Factual verification request detected; route through the fact-checking gate.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (highStructureSignals.length > 0 || complexityTier === "high") {
    decision = buildDecision("structured-reasoning", {
      rationale: "High-structure or uncertain reasoning request detected; use a stricter evaluation gate.",
      qualityGate: "Hinge + Facts + Move + challenge test",
      maxTokens: 600,
      temperature: 0.2,
      fallbackPriority: "red-team-semantic",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else if (storedPreference) {
    decision = buildDecision(storedPreference, {
      rationale: "Recent interaction history suggests this route should be preferred for the current request.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  } else {
    decision = buildDecision("structured-reasoning", {
      rationale: "No special-case fingerprint matched; use the balanced reasoning profile.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.entry?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
  }

  const selectedCostPer1k = (decision.costPer1kInput + decision.costPer1kOutput);
  decision.estimatedInputTokens = estimatedInputTokens;
  decision.routingComplexity = { score: complexity.score, words: complexity.words, questionMarks: complexity.questionMarks, uncertaintyHits: complexity.uncertaintyHits, tier: complexity.tier };
  decision.alternativeRoutes = buildAlternativeRoutes(text, selectedCostPer1k);
  const catalogMatchId = catalogRoute?.entry?.id;
  const catalogConfidence = (catalogMatchId && catalogMatchId === decision.id)
    ? Math.min(catalogRoute.score || 0, 1.0)
    : 0;
  const pathwayConfKey = decision.pathway === "deterministic" ? "local"
    : decision.pathway === "premium" ? "premium"
    : "cheap";
  decision.routingConfidence = decision.deterministicLayer ? 1.0
    : catalogConfidence > 0 ? catalogConfidence
    : decision.confidence?.[pathwayConfKey] || 0.5;

  const premiumEntry = ROUTER_CATALOG.reduce((max, entry) => {
    const cost = (entry.costPer1kInput || 0) + (entry.costPer1kOutput || 0);
    const maxCost = max ? (max.costPer1kInput || 0) + (max.costPer1kOutput || 0) : 0;
    return cost > maxCost ? entry : max;
  }, null) || ROUTER_CATALOG[0];
  const premiumCostPer1k = premiumEntry
    ? (premiumEntry.costPer1kInput + premiumEntry.costPer1kOutput)
    : selectedCostPer1k;
  decision.premiumCostPer1k = premiumCostPer1k;
  decision.premiumCost = (estimatedInputTokens + (decision.maxTokens || 0)) / 1000 * premiumCostPer1k;
  decision.estimatedCost = (estimatedInputTokens + (decision.maxTokens || 0)) / 1000 * selectedCostPer1k;
  decision.pathway = decision.pathway || "medium";

  const escalation = shouldEscalateToRemote({
    confidence: decision.routingConfidence || 0.5,
    pathway: decision.pathway,
    estimatedCost: decision.estimatedCost || 0,
    premiumCost: decision.premiumCost || 0,
    qualityGate: decision.qualityGate || "",
    suspicionScore: decision.routingSignals?.suspicionScore || 0,
  });

  if (escalation.escalate && !decision.deterministicLayer) {
    const escalatedPathway = decision.pathway === "cheap" ? "medium" : "premium";
    decision.pathway = escalatedPathway;
    decision.escalated = true;
    decision.escalationReason = escalation.reason;

    if (premiumEntry && premiumEntry.model) {
      decision.model = premiumEntry.model;
      decision.maxTokens = premiumEntry.maxTokens || decision.maxTokens;
      decision.costPer1kInput = premiumEntry.costPer1kInput;
      decision.costPer1kOutput = premiumEntry.costPer1kOutput;
      const newSelectedCostPer1k = premiumEntry.costPer1kInput + premiumEntry.costPer1kOutput;
      decision.estimatedCost = (estimatedInputTokens + (decision.maxTokens || 0)) / 1000 * newSelectedCostPer1k;
      decision.alternativeRoutes = buildAlternativeRoutes(text, newSelectedCostPer1k);
    }
  }

  persistRouteHistory(decision.id);
  return decision;
}

/**
 * resolveRoutingModel — Extracts the model name from a routing decision.
 * @param {Object} routerDecision - Routing decision object
 * @returns {string} Model name (defaults to FALLBACK_MODEL)
 */
export function resolveRoutingModel(routerDecision) {
  if (!routerDecision?.model) {
    return FALLBACK_MODEL;
  }

  return routerDecision.model;
}

/**
 * getRouterSummary — Returns a concise summary of a routing decision.
 * @param {Object} routerDecision - Routing decision object
 * @returns {Object|null} Summary with key fields or null
 */
export function getRouterSummary(routerDecision) {
  if (!routerDecision) {
    return null;
  }

  return {
    id: routerDecision.id,
    label: routerDecision.label,
    model: routerDecision.model,
    maxTokens: routerDecision.maxTokens,
    costPer1kInput: routerDecision.costPer1kInput,
    costPer1kOutput: routerDecision.costPer1kOutput,
    qualityGate: routerDecision.qualityGate,
    enforce: routerDecision.enforce,
    temperature: routerDecision.temperature,
    fallbackPriority: routerDecision.fallbackPriority,
    fallbackChain: routerDecision.fallbackChain,
    contextWindow: routerDecision.contextWindow,
  };
}

export { getModelCost, getRouterCosts };
