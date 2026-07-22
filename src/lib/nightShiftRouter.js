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
    .replace(/\s+/g, "\\s+")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function getStoredRouteHistory() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistRouteHistory(routeId) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    const existing = getStoredRouteHistory();
    const next = [...existing, routeId].filter(Boolean).slice(-10);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures and keep routing deterministic.
  }
}

function getStoredRoutePreference() {
  const history = getStoredRouteHistory();
  if (history.length < 3) {
    return null;
  }

  const routeCounts = history.reduce((accumulator, routeId) => {
    accumulator[routeId] = (accumulator[routeId] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(routeCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
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

function isLikelyCodingRequest(input) {
  return /\b(implement|build|debug|fix|refactor|function|component|module|api|jest|vite|react|node|typescript|javascript|python|test|patch|class|service|hook|route)\b/i.test(input);
}

function isLikelyGenealogyRequest(input) {
  return /\b(ancestor|descendant|birth|death|marriage|census|familysearch|find a grave|pedigree|genealogy|lineage|same-name|disambiguat|archive|parish|baptism|burial)\b/i.test(input);
}

function isLikelyStoryRequest(input) {
  return /\b(story|plot|character|scene|narrative|outline|dialogue|arc|worldbuilding|conflict|hero|villain)\b/i.test(input);
}

function isAdversarialRequest(text) {
  return /\b(red[- ]?team|adversarial|stress test|attack|challenge|prove\b.*\bwrong|counterargument|break it|stress-test|break\b.*\bargument|find\b.*\bflaw|poke\s+holes)\b/i.test(text);
}

function getComplexityTier(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const uncertaintyHits = UNCERTAINTY_TERMS.filter((term) => text.includes(term)).length;
  const score = words * 2 + questionMarks * 8 + uncertaintyHits * 10;

  const tier = score >= 40 ? "high" : score >= 20 ? "medium" : "low";
  return { tier, score, words, questionMarks, uncertaintyHits };
}

function getHighStructureSignals(text) {
  return HIGH_STRUCTURE_TERMS.filter((term) => keywordMatches(text, term));
}

function getStoredPreferenceForContext(text, domainName) {
  const storedPreference = getStoredRoutePreference();
  if (!storedPreference) {
    return null;
  }

  const genericDomainSignals = {
    "genealogy-deep-dive": /family|ancestor|record|lineage|archive|burial|marriage|census/i,
    "coding-hinge": /code|function|module|api|test|build|debug|implement/i,
    "story-architect": /story|plot|character|scene|narrative|dialogue|worldbuilding/i,
  };

  if (!genericDomainSignals[storedPreference]?.test(text)) {
    return null;
  }

  if (domainName === "assistant") {
    return storedPreference;
  }

  return null;
}

export function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

export function detectDomain(text) {
  const t = normalizeText(text || "");
  if (isLikelyCodingRequest(t)) return "coding";
  if (isLikelyGenealogyRequest(t)) return "genealogy";
  if (isLikelyStoryRequest(t)) return "story";
  return null;
}

export function getFingerprintCatalog() {
  return ROUTER_CATALOG.map((entry) => ({ ...entry }));
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
    decision = buildDecision("red-team-surface", {
      rationale: "Adversarial or red-team request detected; use the surface scan path.",
      routingSignals: {
        complexityTier,
        matchedTerms: ["adversarial"],
        highStructureSignals,
        storedPreference,
      },
    });
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
  } else if (domainName === "story" || catalogRoute?.entry?.id === "story-architect" || isLikelyStoryRequest(input)) {
    decision = buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
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

export function resolveRoutingModel(routerDecision) {
  if (!routerDecision?.model) {
    return FALLBACK_MODEL;
  }

  return routerDecision.model;
}

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
