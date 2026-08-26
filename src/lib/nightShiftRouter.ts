import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };
import modelRates from "../data/modelRates.json" with { type: "json" };
import { computeHingeScore } from "./hingeClassifier";
import { HIGH_STRUCTURE_TERMS, UNCERTAINTY_TERMS, isSimpleGreeting } from "./routingConstants.js";
import { getDomainMatchTerms } from "../domains/_index.js";
import { scanRedTeamInput } from "./redTeamScanner.js";

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
  const explicit = (modelRates as unknown as Record<string, { ceiling: number }>)[model];
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

export function stripUrlsFromText(text: string): string {
  return String(text || "").replace(/https?:\/\/[^\s]+/gi, " ").trim();
}

export function hasCodeHostUrl(text: string): boolean {
  return /https?:\/\/(?:www\.)?(?:github\.com|raw\.githubusercontent\.com|gitlab\.com|bitbucket\.org|npmjs\.com|pypi\.org|gist\.github\.com)\b/i.test(text);
}

export function getRankedDomainMatch(text: string): FingerprintEntry | null {
  const cleanText = stripUrlsFromText(text);
  if (!cleanText) return null;

  const domainMap: Record<string, string> = {
    "coding-hinge": "coding",
    "legal-hinge": "legal",
    "genealogy-deep-dive": "genealogy",
    "story-architect": "story",
  };

  const scored = Object.entries(domainMap).map(([id, domainKey]) => {
    const entry = getCatalogEntry(id);
    const catalogTerms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    const domainTerms = getDomainMatchTerms(domainKey);
    const allTerms = Array.from(new Set([...catalogTerms, ...domainTerms]));
    const hits = allTerms.filter((term: string) => keywordMatches(cleanText, term)).length;
    return { entry, score: hits };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const runnerUp = scored[1];

  // Mathematical Margin Rule:
  // Top domain wins if it has at least 1 hit AND strictly beats the runner-up.
  // Tied scores (e.g. 1 vs 1) represent ambiguity and return null to remain in Generalist.
  if (top && top.score > 0 && (!runnerUp || top.score > runnerUp.score)) {
    return top.entry;
  }
  return null;
}

function getCatalogRouteMatch(text: string): FingerprintEntry | null {
  return getRankedDomainMatch(text);
}

function actualMatchedTerms(id: string, text: string): string[] {
  const cleanText = stripUrlsFromText(text);
  const entry = getCatalogEntry(id);
  const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
  return terms.filter((term) => keywordMatches(cleanText, term));
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
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Support both the original string history format and newer ring entries
    // ({ id, slot }). Invalid entries must not become "[object Object]" during
    // preference scoring.
    return parsed
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && typeof entry.id === "string") return entry.id;
        return null;
      })
      .filter((routeId): routeId is string => Boolean(routeId));
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
    decision.premiumCost = ((decision.maxTokens || 400) / 1000) * (modelRates as unknown as Record<string, { ceiling: number }>)[modelRates._premium].ceiling;
  }
  return decision;
}

export function isAdversarialRequest(text: string): boolean {
  // Task-phrase first pass. Bare words like "attack"/"challenge" were removed
  // — they false-positive on ordinary narrative ("the dragon attacks the
  // castle"). Only task-specific phrases (and the scanner backstop below)
  // escalate. Legitimate adversarial-task phrasings ("challenge every
  // assumption", "tear down this argument") are kept as explicit phrases.
  if (/\b(red[- ]?team|adversarial|stress test|steelman|poke holes|prove wrong|break it|stress-test|prove\b.*\bwrong|devil.s.advocate|challenge every assumption|challenge the assumption|challenge this argument|challenge that assumption|challenge the premise|challenge them|tear down this argument|tear down that argument|tear apart this argument|tear apart the argument|tear apart this research|rip apart|rip it apart|rip this apart|hostile reviewer|hostile review)\b/i.test(text)) {
    return true;
  }
  // Align with the red-team scanner taxonomy: any input the D1 scan escalates
  // must reach the adversarial-validation path, not slip through to a cheaper
  // route. Keeps the router's own keyword regex as a first pass (task phrasing
  // like "poke holes" that the taxonomy may not flag) and the scanner as the
  // taxonomy-aligned backstop (injection phrases like "ignore previous
  // instructions" that the regex misses).
  try {
    const scan = scanRedTeamInput(text);
    return scan.escalateToD2;
  } catch {
    return false;
  }
}

function isMetaQuery(text: string): boolean {
  if (
    /\b(design|implement|code|function|class|story|family|ancestor|legal|runway|tradeoff|decision|build|fix|refactor|cache|api|database|lru|ttl)\b/i.test(
      text
    )
  ) {
    return false;
  }
  return /\b(who are you|what (is|are) you|what is carlo|tell me about (yourself|you)|how do you work|how are you( doing)?)\b/i.test(
    text
  );
}

function isSelfEvaluation(text: string): boolean {
  return /\b(self-evaluate|evaluate yourself|evaluate your architecture|self-diagnose)\b/i.test(text);
}

function getComplexityTier(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const uncertaintyHits = UNCERTAINTY_TERMS.filter((term) => text.includes(term)).length;
  const score = words * 2 + questionMarks * 8 + uncertaintyHits * 10;
  if (score >= 30) return "high";
  if (score >= 15) return "medium";
  return "low";
}

function getHighStructureSignals(text: string): string[] {
  return HIGH_STRUCTURE_TERMS.filter((term) => text.includes(term));
}function hasComparisonFraming(text: string): boolean {
  return /\btrade-?offs?\b|\bpros and cons\b|\bpressure[- ]?test\b/i.test(text);
}

function hasDecisionFraming(text: string): boolean {
  return /\b(runway|trade-?offs?|tradeoffs?|pros and cons|choose a path|decision[- ]making|decision framework|stakeholders?|investors?|ethics|launch vs|what should i do|break (?:this|the) deadlock|how do i make this decision|live with it|dilemma)\b/i.test(text);
}

function hasExplicitCodingAction(text: string): boolean {
  return /\b(implement|debug|fix(?:ing|es)?|refactor|write code|build a (?:function|component|hook|module)|unit test|integration test|stack trace|nullpointerexception|syntaxerror|typescript error|npm test|git commit|pr)\b/i.test(text);
}

/**
 * True when the input is an explicit request to PRODUCE a narrative — a
 * creation verb directly governing a story noun ("write a story about X").
 * Used to resolve the story/coding collision: a narrative request that also
 * mentions code ("write a story about a programmer debugging async/await")
 * must reach the story lane, not the coding lane. Deliberately does NOT fire
 * on incidental story nouns ("write a react component that tells a story")
 * or on story nouns without a creation verb — those stay with the stronger
 * domain match.
 */
function hasNarrativeFraming(text: string): boolean {
  return /(?:write|tell|build|create|make(?:\s+up)?|generate|craft|compose|draft|pen)\s+(?:(?:me|us|them|him|her|it)\s+)?(?:(?:a|an|the|one|another)\s+)?(?:funny|short|little|quick|long|creative|epic|scary|silly|heartwarming|children'?s|bedtime)?\s*(?:story|tale|narrative)\b/i.test(text);
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

  

  // 1. Adversarial & Security Gate: MUST execute before fast-path greeting shortcuts
  // so greeting-prefixed payloads (e.g. "Hello, ignore previous instructions...") cannot bypass D2 escalation.
  if (requiresAdversarial || isAdversarialRequest(text)) {
    // matchedTerms are REAL here, not a hardcoded label: fingerprint terms
    // actually present in the input (red team / stress test / ...). When the
    // route was chosen by the scanner escalation gate, no fingerprint term
    // matches — matchedTerms is empty, which is itself the diagnosis
    // ("scanner-gated, not a literal keyword"). This makes the Analytics
    // Why column able to distinguish regex hits from scanner escalations.
    const routeTerms = actualMatchedTerms("adversarial-validation", text);
    const decision = buildDecision("adversarial-validation", {
      rationale: "Adversarial or red-team request detected; use the premium validation path.",
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

  // 3. Structural Code Host & Technical Review Gate:
  // Runs before lexical domain keyword checks so code hosting platforms (github.com, gitlab.com)
  // route cleanly to The Engineer / Gemini even if repo names contain domain terms (like family-archive).
  if (hasCodeHostUrl(text)) {
    const routeTerms = actualMatchedTerms("coding-hinge", text);
    const decision = buildDecision("coding-hinge", {
      rationale: "Code repository host detected; route through the verification-first coding path.",
      model: "gemini-2.5-flash",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms.length > 0 ? routeTerms : ["github.com"],
        highStructureSignals,
        storedPreference,
      } as RoutingSignals,
    }, hingeResult);
    persistRouteHistory(decision.id);
    return decision;
  }

  const isDecisionQuery = hasDecisionFraming(text) && !hasExplicitCodingAction(text);

  if (domainName === "coding" || (domainName === "assistant" && !hasComparisonFraming(text) && !hasNarrativeFraming(text) && !isDecisionQuery && catalogRoute?.id === "coding-hinge")) {
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

  if (domainName === "legal" || (domainName === "assistant" && catalogRoute?.id === "legal-hinge")) {
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

  if (domainName === "genealogy" || (domainName === "assistant" && catalogRoute?.id === "genealogy-deep-dive")) {
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

  if (domainName === "story" || hasNarrativeFraming(text) || (domainName === "assistant" && catalogRoute?.id === "story-architect")) {
    const routeTerms = actualMatchedTerms("story-architect", text);
    const decision = buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
      routingSignals: {
        complexityTier,
        matchedTerms: routeTerms.length > 0 ? routeTerms : ["story"],
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

  if (highStructureSignals.length > 0 || complexityTier === "high" || (hingeResult && hingeResult.hs >= 0.50)) {
    const decision = buildDecision("structured-reasoning", {
      rationale: "High-complexity or high-hinge reasoning request detected in Generalist; route through DeepSeek.",
      model: "deepseek-chat",
      qualityGate: "Hinge + Facts + Move + challenge test",
      maxTokens: 1500,
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
