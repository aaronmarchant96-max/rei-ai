import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };

const ROUTER_CATALOG = Array.isArray(fingerprintCatalog) ? fingerprintCatalog : [];
const STORAGE_KEY = "night-shift-user-fingerprint";
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

function getCatalogEntry(id) {
  return ROUTER_CATALOG.find((entry) => entry.id === id) || ROUTER_CATALOG[1] || ROUTER_CATALOG[0];
}

function escapeKeyword(term = "") {
  return String(term ?? "")
    .trim()
    .replace(/\s+/g, "\\s+")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const baseEntry = getCatalogEntry(id) || {};
  return {
    id: baseEntry.id || id,
    jobType: baseEntry.jobType || id,
    label: baseEntry.label || id,
    model: baseEntry.model || "llama-3.3-70b-versatile",
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
}

function isSimpleGreeting(text) {
  return /^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))([\s!.?]|$)/i.test(text.trim());
}

function isLikelyCodingRequest(text) {
  return /\b(implement|build|debug|fix|refactor|function|component|module|api|jest|vite|react|node|typescript|javascript|python|test|patch|class|service|hook|route)\b/i.test(text);
}

function isLikelyGenealogyRequest(text) {
  return /\b(ancestor|descendant|birth|death|marriage|census|familysearch|find a grave|record|pedigree|genealogy|lineage|same-name|disambiguat|archive|parish|will|baptism|burial)\b/i.test(text);
}

function isLikelyStoryRequest(text) {
  return /\b(story|plot|character|scene|narrative|outline|dialogue|arc|worldbuilding|conflict|hero|villain)\b/i.test(text);
}

function isAdversarialRequest(text) {
  return /\b(red[- ]?team|adversarial|stress test|attack|challenge|prove wrong|counterargument|break it|stress-test)\b/i.test(text);
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
export function buildRouterDecision({
  input = "",
  domain = "assistant",
  history = [],
  attachedRecord = "",
  requiresAdversarial = false, 
} = {}) {
  const combinedInput = [input, attachedRecord, history?.map((message) => message?.content || "").join(" ")]
    .filter(Boolean)
    .join(" ");
  const text = normalizeText(combinedInput);
  const domainName = String(domain || "assistant").toLowerCase();
  const catalogRoute = getCatalogRouteMatch(text);
  const complexityTier = getComplexityTier(text);
  const highStructureSignals = getHighStructureSignals(text);
  const storedPreference = getStoredPreferenceForContext(text, domainName);

  if (!text) {
    return buildDecision("structured-reasoning");
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
    });
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
    });
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "genealogy" || catalogRoute?.id === "genealogy-deep-dive" || isLikelyGenealogyRequest(text)) {
    const decision = buildDecision("genealogy-deep-dive", {
      rationale: "Genealogy or archival evidence language detected; enforce evidence-tiered reasoning.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "coding" || catalogRoute?.id === "coding-hinge" || isLikelyCodingRequest(text)) {
    const decision = buildDecision("coding-hinge", {
      rationale: "Coding language detected; route through the verification-first coding path.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
    persistRouteHistory(decision.id);
    return decision;
  }

  if (domainName === "story" || catalogRoute?.id === "story-architect" || isLikelyStoryRequest(text)) {
    const decision = buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
    persistRouteHistory(decision.id);
    return decision;
  }

  if (highStructureSignals.length > 0 || complexityTier === "high") {
    const decision = buildDecision("structured-reasoning", {
      rationale: "High-structure or uncertain reasoning request detected; use a stricter evaluation gate.",
      qualityGate: "Hinge + Facts + Move + challenge test",
      maxTokens: 600,
      temperature: 0.2,
      fallbackPriority: "adversarial-validation",
      routingSignals: {
        complexityTier,
        matchedTerms: catalogRoute?.matchTerms || [],
        highStructureSignals,
        storedPreference,
      },
    });
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
    });
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
  });
  persistRouteHistory(decision.id);
  return decision;
}

export function resolveRoutingModel(routerDecision) {
  if (!routerDecision?.model) {
    return "llama-3.3-70b-versatile";
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
