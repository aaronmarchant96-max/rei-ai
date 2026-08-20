import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };
import modelRates from "../data/modelRates.json" with { type: "json" };
import { computeHingeScore } from "./hingeClassifier";
import { HIGH_STRUCTURE_TERMS, UNCERTAINTY_TERMS, isSimpleGreeting } from "./routingConstants.js";
import { getDomainMatchTerms } from "../domains/_index.js";
import { scanRedTeamInput } from "./redTeamScanner.js";
const ROUTER_CATALOG = Array.isArray(fingerprintCatalog) ? fingerprintCatalog : [];
const FALLBACK_COST_INPUT = 59e-5;
const FALLBACK_COST_OUTPUT = 79e-5;
const STORAGE_KEY = "night-shift-user-fingerprint";
function getModelCeilingRate(model) {
  const explicit = modelRates[model];
  if (explicit) return explicit.ceiling;
  const entry = ROUTER_CATALOG.find((e) => e.model === model);
  if (entry) {
    const input = entry.costPer1kInput ?? (entry.costPer1k || 0) / 1e3;
    const output = entry.costPer1kOutput ?? (entry.costPer1k || 0) / 1e3;
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
  return String(term ?? "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}
function keywordMatches(text, term = "") {
  const escaped = escapeKeyword(term);
  if (!escaped) {
    return false;
  }
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}
function stripUrlsFromText(text) {
  return String(text || "").replace(/https?:\/\/[^\s]+/gi, " ").trim();
}
function hasCodeHostUrl(text) {
  return /https?:\/\/(?:www\.)?(?:github\.com|raw\.githubusercontent\.com|gitlab\.com|bitbucket\.org|npmjs\.com|pypi\.org|gist\.github\.com)\b/i.test(text);
}
function getRankedDomainMatch(text) {
  const cleanText = stripUrlsFromText(text);
  if (!cleanText) return null;
  const domainMap = {
    "coding-hinge": "coding",
    "legal-hinge": "legal",
    "genealogy-deep-dive": "genealogy",
    "story-architect": "story"
  };
  const scored = Object.entries(domainMap).map(([id, domainKey]) => {
    const entry = getCatalogEntry(id);
    const catalogTerms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    const domainTerms = getDomainMatchTerms(domainKey);
    const allTerms = Array.from(/* @__PURE__ */ new Set([...catalogTerms, ...domainTerms]));
    const hits = allTerms.filter((term) => keywordMatches(cleanText, term)).length;
    return { entry, score: hits };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const runnerUp = scored[1];
  if (top && top.score > 0 && (!runnerUp || top.score > runnerUp.score)) {
    return top.entry;
  }
  return null;
}
function getCatalogRouteMatch(text) {
  return getRankedDomainMatch(text);
}
function actualMatchedTerms(id, text) {
  const cleanText = stripUrlsFromText(text);
  const entry = getCatalogEntry(id);
  const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
  return terms.filter((term) => keywordMatches(cleanText, term));
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
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && typeof entry.id === "string") return entry.id;
      return null;
    }).filter((routeId) => Boolean(routeId));
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
    model: baseEntry.model || "deepseek-v4-flash",
    maxTokens: baseEntry.maxTokens || 400,
    costPer1k: baseEntry.costPer1k ?? 1,
    qualityGate: baseEntry.qualityGate || "Default reasoning gate",
    enforce: baseEntry.enforce || null,
    description: baseEntry.description || "Default routing decision",
    temperature: baseEntry.temperature ?? 0.7,
    fallbackPriority: baseEntry.fallbackPriority || null,
    routingSignals: {},
    ...overrides
  };
  if (hingeData) {
    decision.hingeScore = hingeData.hs;
    decision.hingeVector = hingeData.hingeVector;
    decision.hingeTier = hingeData.tier;
    decision.estimatedCost = (decision.maxTokens || 400) / 1e3 * getModelCeilingRate(decision.model);
    decision.premiumCost = (decision.maxTokens || 400) / 1e3 * modelRates[modelRates._premium].ceiling;
  }
  return decision;
}
function isAdversarialRequest(text) {
  if (/\b(red[- ]?team|adversarial|stress test|steelman|poke holes|prove wrong|break it|stress-test|prove\b.*\bwrong|devil.s.advocate|challenge every assumption|challenge the assumption|challenge this argument|challenge that assumption|challenge the premise|challenge them|tear down this argument|tear down that argument|tear apart this argument|tear apart the argument|tear apart this research|rip apart|rip it apart|rip this apart|hostile reviewer|hostile review)\b/i.test(text)) {
    return true;
  }
  try {
    const scan = scanRedTeamInput(text);
    return scan.escalateToD2;
  } catch {
    return false;
  }
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
  if (score >= 30) return "high";
  if (score >= 15) return "medium";
  return "low";
}
function getHighStructureSignals(text) {
  return HIGH_STRUCTURE_TERMS.filter((term) => text.includes(term));
}
function hasComparisonFraming(text) {
  return /\btrade-?offs?\b|\bpros and cons\b|\bpressure[- ]?test\b/i.test(text);
}
function hasNarrativeFraming(text) {
  return /(?:write|tell|build|create|make(?:\s+up)?|generate|craft|compose|draft|pen)\s+(?:(?:me|us|them|him|her|it)\s+)?(?:(?:a|an|the|one|another)\s+)?(?:funny|short|little|quick|long|creative|epic|scary|silly|heartwarming|children'?s|bedtime)?\s*(?:story|tale|narrative)\b/i.test(text);
}
function getStoredPreferenceForContext(text, domainName) {
  const storedPreference = getStoredRoutePreference();
  if (!storedPreference) {
    return null;
  }
  const genericDomainSignals = {
    "genealogy-deep-dive": /family|ancestor|record|lineage|archive|burial|marriage|census/i,
    "coding-hinge": /code|function|module|api|test|build|debug|implement/i,
    "story-architect": /story|plot|character|scene|narrative|dialogue|worldbuilding/i
  };
  if (!genericDomainSignals[storedPreference]?.test(text)) {
    return null;
  }
  if (domainName === "assistant") {
    return storedPreference;
  }
  return null;
}
function getFingerprintCatalog() {
  return ROUTER_CATALOG.map((entry) => ({ ...entry }));
}
function buildRouterDecision({
  input = "",
  domain = "assistant",
  history = [],
  attachedRecord = "",
  requiresAdversarial = false
} = {}) {
  const currentText = normalizeText([input, attachedRecord].filter(Boolean).join(" "));
  const combinedInput = [input, attachedRecord, history?.map((message) => message?.content || "").join(" ")].filter(Boolean).join(" ");
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
  if (requiresAdversarial || isAdversarialRequest(text)) {
    const routeTerms = actualMatchedTerms("adversarial-validation", text);
    const decision2 = buildDecision("adversarial-validation", {
      rationale: "Adversarial or red-team request detected; use the premium validation path.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (isSimpleGreeting(text)) {
    const decision2 = buildDecision("simple-greeting", {
      rationale: "Greeting detected; use the cheapest fast path.",
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (isMetaQuery(text)) {
    const decision2 = buildDecision("simple-greeting", {
      rationale: "Meta-query about system identity or function; use cheapest path.",
      routingSignals: {
        complexityTier,
        matchedTerms: [],
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (isSelfEvaluation(text)) {
    const decision2 = buildDecision("coding-hinge", {
      rationale: "Self-evaluation request detected; routing to The Engineer with strict reasoning threshold.",
      qualityGate: "Architecture self-evaluation gate",
      maxTokens: 800,
      temperature: 0.2,
      routingSignals: {
        complexityTier,
        matchedTerms: ["self-evaluate"],
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (hasCodeHostUrl(text)) {
    const routeTerms = actualMatchedTerms("coding-hinge", text);
    const decision2 = buildDecision("coding-hinge", {
      rationale: "Code repository host detected; route through the verification-first coding path.",
      model: "gemini-2.5-flash",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms.length > 0 ? routeTerms : ["github.com"],
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (domainName === "coding" || domainName === "assistant" && !hasComparisonFraming(text) && !hasNarrativeFraming(text) && catalogRoute?.id === "coding-hinge") {
    const routeTerms = actualMatchedTerms("coding-hinge", text);
    const decision2 = buildDecision("coding-hinge", {
      rationale: "Coding language detected; route through the verification-first coding path.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (domainName === "legal" || domainName === "assistant" && catalogRoute?.id === "legal-hinge") {
    const routeTerms = actualMatchedTerms("legal-hinge", text);
    const decision2 = buildDecision("legal-hinge", {
      rationale: "Legal case analysis or precedent evaluation detected; enforce verified-index grounding.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (domainName === "genealogy" || domainName === "assistant" && catalogRoute?.id === "genealogy-deep-dive") {
    const routeTerms = actualMatchedTerms("genealogy-deep-dive", text);
    const decision2 = buildDecision("genealogy-deep-dive", {
      rationale: "Genealogy or archival evidence language detected; enforce evidence-tiered reasoning.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (domainName === "story" || hasNarrativeFraming(text) || domainName === "assistant" && catalogRoute?.id === "story-architect") {
    const routeTerms = actualMatchedTerms("story-architect", text);
    const decision2 = buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms.length > 0 ? routeTerms : ["story"],
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (storedPreference) {
    const decision2 = buildDecision(storedPreference, {
      rationale: "Recent interaction history suggests this route should be preferred for the current request.",
      routingSignals: {
        complexityTier,
        matchedTerms: actualMatchedTerms(storedPreference, text),
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  if (highStructureSignals.length > 0 || complexityTier === "high" || hingeResult && hingeResult.hs >= 0.5) {
    const decision2 = buildDecision("structured-reasoning", {
      rationale: "High-complexity or high-hinge reasoning request detected in Generalist; route through Gemini.",
      model: "gemini-2.5-flash",
      qualityGate: "Hinge + Facts + Move + challenge test",
      maxTokens: 1500,
      temperature: 0.2,
      fallbackPriority: "adversarial-validation",
      routingSignals: {
        complexityTier,
        matchedTerms: actualMatchedTerms("structured-reasoning", text),
        highStructureSignals,
        storedPreference
      }
    }, hingeResult);
    persistRouteHistory(decision2.id);
    return decision2;
  }
  const decision = buildDecision("structured-reasoning", {
    rationale: "No special-case fingerprint matched; use the balanced reasoning profile.",
    routingSignals: {
      complexityTier,
      matchedTerms: actualMatchedTerms("structured-reasoning", text),
      highStructureSignals,
      storedPreference
    }
  }, hingeResult);
  persistRouteHistory(decision.id);
  return decision;
}
function resolveRoutingModel(routerDecision) {
  if (!routerDecision?.model) {
    return "deepseek-v4-flash";
  }
  return routerDecision.model;
}
function getRouterSummary(routerDecision) {
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
    fallbackPriority: routerDecision.fallbackPriority
  };
}
function getRouterCosts() {
  const models = {};
  for (const entry of ROUTER_CATALOG) {
    if (entry.model && !models[entry.model]) {
      models[entry.model] = {
        costPer1kInput: entry.costPer1kInput ?? FALLBACK_COST_INPUT,
        costPer1kOutput: entry.costPer1kOutput ?? FALLBACK_COST_OUTPUT,
        label: entry.label || entry.model
      };
    }
  }
  return models;
}
export {
  buildRouterDecision,
  getFingerprintCatalog,
  getRankedDomainMatch,
  getRouterCosts,
  getRouterSummary,
  hasCodeHostUrl,
  isAdversarialRequest,
  resolveRoutingModel,
  stripUrlsFromText
};
