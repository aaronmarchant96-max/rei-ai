import fingerprintCatalog from "../../data/fingerprints.json" with { type: "json" };

const ROUTER_CATALOG = Array.isArray(fingerprintCatalog) ? fingerprintCatalog : [];

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
  const combinedInput = [input, attachedRecord, history?.map((message) => message?.content || "").join(" ")]
    .filter(Boolean)
    .join(" ");
  const text = normalizeText(combinedInput);
  const domainName = String(domain || "assistant").toLowerCase();

  if (!text) {
    return buildDecision("structured-reasoning");
  }

  if (isSimpleGreeting(text)) {
    return buildDecision("simple-greeting", {
      rationale: "Greeting detected; use the cheapest fast path.",
    });
  }

  if (requiresAdversarial || isAdversarialRequest(text)) {
    return buildDecision("adversarial-validation", {
      rationale: "Adversarial or red-team request detected; use the premium validation path.",
    });
  }

  const catalogRoute = getCatalogRouteMatch(text);

  if (domainName === "genealogy" || catalogRoute?.id === "genealogy-deep-dive" || isLikelyGenealogyRequest(text)) {
    return buildDecision("genealogy-deep-dive", {
      rationale: "Genealogy or archival evidence language detected; enforce evidence-tiered reasoning.",
    });
  }

  if (domainName === "coding" || catalogRoute?.id === "coding-hinge" || isLikelyCodingRequest(text)) {
    return buildDecision("coding-hinge", {
      rationale: "Coding language detected; route through the verification-first coding path.",
    });
  }

  if (domainName === "story" || catalogRoute?.id === "story-architect" || isLikelyStoryRequest(text)) {
    return buildDecision("story-architect", {
      rationale: "Story or narrative language detected; route through the storytelling blueprint path.",
    });
  }

  return buildDecision("structured-reasoning", {
    rationale: "No special-case fingerprint matched; use the balanced reasoning profile.",
  });
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
  };
}
