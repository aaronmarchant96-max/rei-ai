import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };
import modelRates from "../data/modelRates.json" with { type: "json" };
import { computeHingeScore } from "./hingeClassifier";
import { HIGH_STRUCTURE_TERMS, UNCERTAINTY_TERMS, isSimpleGreeting } from "./routingConstants.js";
import { getDomainMatchTerms } from "../domains/_index.js";

interface FingerprintEntry {
  id?: string;
  jobType?: string;
  label?: string;
  model?: string;
  maxTokens?: number;
  costPer1k?: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  qualityGate?: string;
  enforce?: string | null;
  description?: string;
  temperature?: number;
  fallbackPriority?: string | null;
  matchTerms?: string[];
}

interface RouterDecision {
  id: string;
  jobType: string;
  label: string;
  model: string;
  maxTokens: number;
  costPer1k: number;
  qualityGate: string;
  enforce: string | null;
  description: string;
  temperature: number;
  fallbackPriority: string | null;
  routingSignals: Record<string, any>;
  rationale?: string;
  hingeScore?: number;
  hingeVector?: Record<string, any>;
  hingeTier?: string;
  estimatedCost?: number;
  premiumCost?: number;
}

interface RoutingSignals {
  complexityTier?: string;
  matchedTerms?: string[];
  highStructureSignals?: string[];
  storedPreference?: string | null;
}

interface HingeResult {
  hs: number;
  cheapRouteConfidence: number;
  tier: string;
  hingeVector: {
    ecs: number;
    das: number;
    aps: number;
    features: Record<string, any>;
  };
}

const ROUTER_CATALOG: FingerprintEntry[] = Array.isArray(fingerprintCatalog) ? fingerprintCatalog : [];
const FALLBACK_COST_INPUT = 0.00059;
const FALLBACK_COST_OUTPUT = 0.00079;
const STORAGE_KEY = "night-shift-user-fingerprint";

function getModelCeilingRate(model: string): number {
  const explicit = (modelRates as Record<string, { ceiling: number }>)[model];
  if (explicit) return explicit.ceiling;

  const entry = ROUTER_CATALOG.find((e) => e.model === model);
  if (entry) {
    const input = entry.costPer1kInput ?? (entry.costPer1k || 0) / 1000;
    const output = entry.costPer1kOutput ?? (entry.costPer1k || 0) / 1000;
    if (input || output) return (input || 0) + (output || 0);
  }
  return FALLBACK_COST_INPUT + FALLBACK_COST_OUTPUT;
}

function normalizeText(value = ""): string {
  return String(value ?? "").toLowerCase().trim();
}

function getCatalogEntry(id: string): FingerprintEntry {
  return ROUTER_CATALOG.find((entry) => entry.id === id) || ROUTER_CATALOG[1] || ROUTER_CATALOG[0];
}

function computeCatalogScores(text: string): number[] {
  return ROUTER_CATALOG.map((entry) => {
    const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    return terms.filter((term: string) => keywordMatches(text, term)).length;
  });
}

function escapeKeyword(term = ""): string {
  return String(term ?? "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

function keywordMatches(text: string, term = ""): boolean {
  const escaped = escapeKeyword(term);
  if (!escaped) {
    return false;
  }
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function getCatalogRouteMatch(text: string): FingerprintEntry | null {
  for (const entry of ROUTER_CATALOG) {
    const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    if (terms.some((term) => keywordMatches(text, term))) {
      return entry;
    }
  }
  return null;
}

function actualMatchedTerms(id: string, text: string): string[] {
  const entry = getCatalogEntry(id);
  const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
  return terms.filter((term) => keywordMatches(text, term));
}

function domainKeywordMatches(text: string, domainId: string): boolean {
  const terms = getDomainMatchTerms(domainId);
  return terms.some((term) => {
    const normalized = term.replace(/\./g, " ");
    return keywordMatches(text, normalized);
  });
}

function getStoredRouteHistory(): string[] {
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

function persistRouteHistory(routeId: string): void {
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

function getStoredRoutePreference(): string | null {
  const history = getStoredRouteHistory();
  if (history.length < 3) {
    return null;
  }
  const routeCounts = history.reduce((accumulator: Record<string, number>, routeId) => {
    accumulator[routeId] = (accumulator[routeId] || 0) + 1;
    return accumulator;
  }, {});
  return Object.entries(routeCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
}

function buildDecision(id: string, overrides: Record<string, any> = {}, hingeData: HingeResult | null = null): RouterDecision {
  const baseEntry = getCatalogEntry(id) || {};
  const decision: RouterDecision = {
    id: baseEntry.id || id,
    jobType: baseEntry.jobType || id,
    label: baseEntry.label || id,
    model: baseEntry.model || "deepseek-v4-flash",
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
    decision.premiumCost = ((decision.maxTokens || 400) / 1000) * modelRates["gpt-4o"].ceiling;
  }
  return decision;
}

export function isAdversarialRequest(text: string): boolean {
  return /\b(red[- ]?team|adversarial|stress test|steelman|poke holes|find.flaws|attack|challenge|prove wrong|counterargument|break it|stress-test|prove\b.*\bwrong|devil.s.advocate|tear.down)\b/i.test(text);
}

function isMetaQuery(text: string): boolean {
  return /\bhow (do|are) you|who are you|what (is|are) you|what is carlo|explain (how|what)|tell me about (yourself|you)\b/i.test(text);
}

function isSelfEvaluation(text: string): boolean {
  return /\b(self-evaluate|evaluate yourself|evaluate your architecture|self-diagnose)\b/i.test(text);
}

function getComplexityTier(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const uncertaintyHits = UNCERTAINTY_TERMS.filter((term) => text.includes(term)).length;
  const score = words * 2 + questionMarks * 8 + uncertaintyHits * 10;
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function getHighStructureSignals(text: string): string[] {
  return HIGH_STRUCTURE_TERMS.filter((term) => text.includes(term));
}

function getStoredPreferenceForContext(text: string, domainName: string): string | null {
  const storedPreference = getStoredRoutePreference();
  if (!storedPreference) {
    return null;
  }
  const genericDomainSignals: Record<string, RegExp> = {
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

export function getFingerprintCatalog(): FingerprintEntry[] {
  return ROUTER_CATALOG.map((entry) => ({ ...entry }));
}

export function buildRouterDecision({
  input = "",
  domain = "assistant",
  history = [],
  attachedRecord = "",
  requiresAdversarial = false,
}: {
  input?: string;
  domain?: string;
  history?: any[];
  attachedRecord?: string;
  requiresAdversarial?: boolean;
} = {}): RouterDecision {
  const currentText = normalizeText([input, attachedRecord].filter(Boolean).join(" "));
  const combinedInput = [input, attachedRecord, history?.map((message: any) => message?.content || "").join(" ")]
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
      } as RoutingSignals,
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
      } as RoutingSignals,
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
      } as RoutingSignals,
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
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "coding" || (domainName === "assistant" && (catalogRoute?.id === "coding-hinge" || domainKeywordMatches(text, "coding")))) {
    const routeTerms = actualMatchedTerms("coding-hinge", text);
    const decision = buildDecision("coding-hinge", {
      rationale: "Coding language detected; route through the verification-first coding path.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "genealogy" || (domainName === "assistant" && (catalogRoute?.id === "genealogy-deep-dive" || domainKeywordMatches(text, "genealogy")))) {
    const routeTerms = actualMatchedTerms("genealogy-deep-dive", text);
    const decision = buildDecision("genealogy-deep-dive", {
      rationale: "Genealogy or archival evidence language detected; enforce evidence-tiered reasoning.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "story" || (domainName === "assistant" && (catalogRoute?.id === "story-architect" || domainKeywordMatches(text, "story")))) {
    const routeTerms = actualMatchedTerms("story-architect", text);
    const decision = buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "legal" || (domainName === "assistant" && (catalogRoute?.id === "legal-hinge" || domainKeywordMatches(text, "legal")))) {
    const routeTerms = actualMatchedTerms("legal-hinge", text);
    const decision = buildDecision("legal-hinge", {
      rationale: "Legal case analysis or precedent evaluation detected; enforce verified-index grounding.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms,
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
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
        matchedTerms: actualMatchedTerms("structured-reasoning", text),
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  if (storedPreference) {
    const decision = buildDecision(storedPreference, {
      rationale: "Recent interaction history suggests this route should be preferred for the current request.",
      routingSignals: {
        complexityTier,
        matchedTerms: actualMatchedTerms(storedPreference, text),
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  const decision = buildDecision("structured-reasoning", {
    rationale: "No special-case fingerprint matched; use the balanced reasoning profile.",
    routingSignals: {
      complexityTier,
      matchedTerms: actualMatchedTerms("structured-reasoning", text),
      highStructureSignals,
      storedPreference,
    } as RoutingSignals,
  }, hingeResult);
  persistRouteHistory(decision.id);
  return decision;
}

export function resolveRoutingModel(routerDecision: RouterDecision | null): string {
  if (!routerDecision?.model) {
    return "deepseek-v4-flash";
  }
  return routerDecision.model;
}

export interface RouterSummary {
  id: string;
  label: string;
  model: string;
  maxTokens: number;
  qualityGate: string;
  enforce: string | null;
  temperature: number;
  fallbackPriority: string | null;
}

export function getRouterSummary(routerDecision: RouterDecision | null): RouterSummary | null {
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

export interface RouterCostEntry {
  costPer1kInput: number;
  costPer1kOutput: number;
  label: string;
}

export function getRouterCosts(): Record<string, RouterCostEntry> {
  const models: Record<string, RouterCostEntry> = {};
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
