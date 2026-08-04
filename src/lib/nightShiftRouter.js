import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };
import { computeHingeScore } from "./hingeClassifier.js";
import { HIGH_STRUCTURE_TERMS, UNCERTAINTY_TERMS, isSimpleGreeting } from "./routingConstants.js";
import { getDomainMatchTerms } from "../domains/_index.js";

const ROUTER_CATALOG = Array.isArray(fingerprintCatalog) ? fingerprintCatalog : [];
const FALLBACK_COST_INPUT = 0.00059;
const FALLBACK_COST_OUTPUT = 0.00079;
const STORAGE_KEY = "night-shift-user-fingerprint";
const PREMIUM_INPUT_RATE = 0.0025;
const PREMIUM_OUTPUT_RATE = 0.0100;

function getModelCeilingRate(model) {
  if (model === "gpt-4o") return PREMIUM_INPUT_RATE + PREMIUM_OUTPUT_RATE;
  if (model === "deepseek-chat") return 0.00014 + 0.00028;
  if (model === "llama-3.1-8b-instant") return 0.00005 + 0.00008;

  const entry = ROUTER_CATALOG.find((e) => e.model === model);
  if (entry) {
    const input = entry.costPer1kInput ?? entry.costPer1k / 1000;
    const output = entry.costPer1kOutput ?? entry.costPer1k / 1000;
    if (input || output) return (input || 0) + (output || 0);
  }
  return FALLBACK_COST_INPUT + FALLBACK_COST_OUTPUT;
}

function normalizeText(value = "") {
  return String(value ?? "").toLowerCase().trim();
}

function getCatalogEntry(id) {
  return ROUTER_CATALOG.find((entry) => entry.id === id) || ROUTER_CATALOG[1] || ROUTER_CATALOG[0];
}

function computeCatalogScores(text) {
  return ROUTER_CATALOG.map((entry) => {
    const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    return terms.filter((term) => keywordMatches(text, term)).length;
  });
}

function escapeKeyword(term = "") {
  return String(term ?? "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

function keywordMatches(text, term = "") {
  const escaped = escapeKeyword(term);
  if (!escaped) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function getCatalogRouteMatch(text) {
  for (const entry of ROUTER_CATALOG) {
    const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    if (terms.some((term) => keywordMatches(text, term))) {
      return entry;
    }
  }

  return null;
}

function domainKeywordMatches(text, domainId) {
  const terms = getDomainMatchTerms(domainId);
  return terms.some((term) => {
    const normalized = term.replace(/\./g, " ");
    return keywordMatches(text, normalized);
  });
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

function buildDecision(id, overrides = {}, hingeData = null) {
  const baseEntry = getCatalogEntry(id) || {};
  const decision = {
    id: baseEntry.id || id,
    jobType: baseEntry.jobType || id,
    label: baseEntry.label || id,
    model: baseEntry.model || "deepseek-chat",
    maxTokens: baseEntry.maxTokens || 400,
    costPer1k: baseEntry.costPer1k ?? 1.0,
    qualityGate: baseEntry.qualityGate || "Default reasoning gate",
    enforce: baseEntry.enforce || null,
    description: baseEntry.description || "Default routing decision",
    temperature: baseEntry.temperature ?? 0.7,
    fallbackPriority: baseEntry.fallbackPriority || null,
    routingSignals: {},
    ...overrides,
  };
  if (hingeData) {
    decision.hingeScore = hingeData.hs;
    decision.hingeVector = hingeData.hingeVector;
    decision.hingeTier = hingeData.tier;
    decision.estimatedCost = ((decision.maxTokens || 400) / 1000) * getModelCeilingRate(decision.model);
    decision.premiumCost = ((decision.maxTokens || 400) / 1000) * (PREMIUM_INPUT_RATE + PREMIUM_OUTPUT_RATE);
  }
  return decision;
}

function isAdversarialRequest(text) {
  return /\b(red[- ]?team|adversarial|stress test|steelman|poke holes|find.flaws|attack|challenge|prove wrong|counterargument|break it|stress-test|prove\b.*\bwrong|devil.s.advocate|tear.down)\b/i.test(text);
}

function isMetaQuery(text) {
  return /\bhow (do|are) you|who are you|what (is|are) you|what is carlo|explain (how|what)|tell me about (yourself|you)\b/i.test(text);
}

function isSelfEvaluation(text) {
  return /\b(self-evaluate|evaluate yourself|evaluate your architecture|self-diagnose)\b/i.test(text);
}

function getComplexityTier(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const uncertaintyHits = UNCERTAINTY_TERMS.filter((term) => text.includes(term)).length;
  const score = words * 2 + questionMarks * 8 + uncertaintyHits * 10;

  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function getHighStructureSignals(text) {
  return HIGH_STRUCTURE_TERMS.filter((term) => text.includes(term));
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

export function getFingerprintCatalog() {
  return ROUTER_CATALOG.map((entry) => ({ ...entry }));
}

export function buildRouterDecision({
  input = "",
  domain = "assistant",
  history = [],
  attachedRecord = "",
  requiresAdversarial = false,
} = {}) {
  const currentText = normalizeText([input, attachedRecord].filter(Boolean).join(" "));
  const combinedInput = [input, attachedRecord, history?.map((message) => message?.content || "").join(" ")]
    .filter(Boolean)
    .join(" ");
  const text = currentText || normalizeText(combinedInput);
  const domainName = String(domain || "assistant").toLowerCase();
  const catalogRoute = getCatalogRouteMatch(text);
  const complexityTier = getComplexityTier(text);
  const highStructureSignals = getHighStructureSignals(text);
  const storedPreference = getStoredPreferenceForContext(text, domainName);
  const hingeResult = computeHingeScore(combinedInput, computeCatalogScores(text));

  if (!text) {
    return buildDecision("structured-reasoning", {}, hingeResult);
  }

  if (isSimpleGreeting(text)) {
    const decision = buildDecision("simple-greeting", {
      rationale: "Greeting detected; use the cheapest fast path.",
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (isMetaQuery(text)) {
    const decision = buildDecision("simple-greeting", {
      rationale: "Meta-query about system identity or function; use cheapest path.",
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (isSelfEvaluation(text)) {
    const decision = buildDecision("coding-hinge", {
      rationale: "Self-evaluation request detected; routing to The Engineer with strict reasoning threshold.",
      qualityGate: "Architecture self-evaluation gate",
      maxTokens: 800,
      temperature: 0.2,
      routingSignals: {
        complexityTier,
        matchedTerms: ["self-evaluate"],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (requiresAdversarial || isAdversarialRequest(text)) {
    const decision = buildDecision("adversarial-validation", {
      rationale: "Adversarial or red-team request detected; use the premium validation path.",
      routingSignals: {
        complexityTier,
        matchedTerms: ["adversarial"],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "coding" || catalogRoute?.id === "coding-hinge" || domainKeywordMatches(text, "coding")) {
    const decision = buildDecision("coding-hinge", {
      rationale: "Coding language detected; route through the verification-first coding path.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "genealogy" || catalogRoute?.id === "genealogy-deep-dive" || domainKeywordMatches(text, "genealogy")) {
    const decision = buildDecision("genealogy-deep-dive", {
      rationale: "Genealogy or archival evidence language detected; enforce evidence-tiered reasoning.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "story" || catalogRoute?.id === "story-architect" || domainKeywordMatches(text, "story")) {
    const decision = buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "legal" || catalogRoute?.id === "legal-hinge" || domainKeywordMatches(text, "legal")) {
    const decision = buildDecision("legal-hinge", {
      rationale: "Legal case analysis or precedent evaluation detected; enforce verified-index grounding.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (highStructureSignals.length > 0 || complexityTier === "high") {
    const decision = buildDecision("structured-reasoning", {
      rationale: "High-structure or uncertain reasoning request detected; use a stricter evaluation gate.",
      qualityGate: "Hinge + Facts + Move + challenge test",
      maxTokens: 800,
      temperature: 0.2,
      fallbackPriority: "adversarial-validation",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (storedPreference) {
    const decision = buildDecision(storedPreference, {
      rationale: "Recent interaction history suggests this route should be preferred for the current request.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  const decision = buildDecision("structured-reasoning", {
    rationale: "No special-case fingerprint matched; use the balanced reasoning profile.",
    routingSignals: {
      complexityTier,
      matchedTerms: catalogRoute?.matchTerms || [],
      highStructureSignals,
      storedPreference,
    },
  }, hingeResult);
  persistRouteHistory(decision.id);
  return decision;
}

export function resolveRoutingModel(routerDecision) {
  if (!routerDecision?.model) {
    return "deepseek-chat";
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
    qualityGate: routerDecision.qualityGate,
    enforce: routerDecision.enforce,
    temperature: routerDecision.temperature,
    fallbackPriority: routerDecision.fallbackPriority,
  };
}

export function getRouterCosts() {
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
