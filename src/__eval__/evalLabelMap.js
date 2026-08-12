/**
 * evalLabelMap.js — canonical route registry for routing evals.
 *
 * Single source of truth connecting three representations:
 *
 *   eval fixture category  ──►  display label  ──►  canonical category  ──►  fingerprint route id
 *   ("creative")                ("Story Architect")   ("creative")           ("story-architect")
 *
 * Every eval that measures routing accuracy must consume normalizeLabel() /
 * normalizeRouteId() from THIS module instead of defining its own local label
 * map. That makes the normalization layer one artifact instead of five copies
 * that silently drift apart (the root cause of the Coding Hinge → The Engineer
 * contamination fixed in b2ed578).
 *
 * The integrity gate (scripts/validate-eval-integrity.mjs) validates the
 * terminal value of every chain against data/fingerprints.json: a canonical
 * category must map to a fingerprint route id that actually exists. A category
 * that maps to nothing (like the phantom "Fact Check" route) must be declared
 * in EXCLUDED_CATEGORIES with a reason, or the gate fails CI.
 */

/** Display label → canonical category. Includes explicit backwards-compatible
 *  aliases for renamed labels so history stays machine-readable. */
export const LABEL_TO_CATEGORY = {
  "Simple Greeting": "greeting",
  // Renamed: "Coding Hinge" → "The Engineer" (fingerprints.json:76). Both map
  // to "coding" — the alias is intentional, not a silent drop.
  "Coding Hinge": "coding",
  "The Engineer": "coding",
  "Genealogy Deep Dive": "genealogy",
  "Story Architect": "creative",
  "Creative Prose": "creative",
  // Route not implemented in fingerprints.json — declared excluded below.
  "Fact Check": "factCheck",
  "Structured Reasoning": "reasoning",
  "Adversarial Validation": "adversarial",
  "Red Team Surface": "adversarial",
  "Red Team Semantic": "adversarial",
  "Red Team Deep": "adversarial",
  "Legal Hinge": "legal",
};

/** Canonical category → fingerprint route id. Every value MUST exist as an
 *  `id` in data/fingerprints.json or the integrity gate fails. */
export const CATEGORY_TO_ROUTE_ID = {
  greeting: "simple-greeting",
  coding: "coding-hinge",
  genealogy: "genealogy-deep-dive",
  creative: "story-architect",
  reasoning: "structured-reasoning",
  adversarial: "adversarial-validation",
  legal: "legal-hinge",
};

/** Fingerprint route id → canonical category (inverse map for evals that key
 *  on route ids rather than display labels). */
export const ROUTE_ID_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_ROUTE_ID).map(([category, routeId]) => [routeId, category])
);

/** Categories intentionally mapped to NO fingerprint route. Every entry must
 *  carry a reason string; absence of an entry here means the gate treats the
 *  category as a phantom-route failure. */
export const EXCLUDED_CATEGORIES = {
  factCheck: "route_not_implemented",
};

/** Renamed display labels: alias → the current label that replaced it. The
 *  gate verifies both keys exist in LABEL_TO_CATEGORY and map to the same
 *  canonical category, so renames can never silently drop the old identity. */
export const LEGACY_ALIASES = {
  "Coding Hinge": "The Engineer",
};

/** Normalize a display label to its canonical category. Unmapped labels return
 *  "unknown" (never throw) so evals degrade loudly but safely. */
export function normalizeLabel(label) {
  return LABEL_TO_CATEGORY[label] || "unknown";
}

/** Normalize a fingerprint route id to its canonical category. */
export function normalizeRouteId(routeId) {
  return ROUTE_ID_TO_CATEGORY[routeId] || "unknown";
}

/**
 * Validate the registry chain against the real fingerprint catalog.
 *
 * @param {Array<{id?: string, label?: string}>} fingerprints parsed
 *        data/fingerprints.json (or an equivalent test double).
 * @returns {Array<{type: string, message: string}>} integrity issues.
 *         Empty array = healthy.
 */
export function validateEvalIntegrity(fingerprints) {
  const issues = [];
  const fpLabels = new Set((fingerprints || []).map((f) => f.label).filter(Boolean));
  const fpRouteIds = new Set((fingerprints || []).map((f) => f.id).filter(Boolean));

  // 1. Every canonical category must terminate at a real fingerprint route id.
  for (const [category, routeId] of Object.entries(CATEGORY_TO_ROUTE_ID)) {
    if (!fpRouteIds.has(routeId)) {
      issues.push({
        type: "error",
        message:
          `canonical category "${category}" maps to route id "${routeId}" ` +
          "which does not exist in fingerprints.json. Either add the route, " +
          `or move "${category}" to EXCLUDED_CATEGORIES with a reason.`,
      });
    }
  }

  // 2. Every display label must normalize to a canonical category or an
  //    explicitly-excluded one. A label pointing at an undeclared category is
  //    a phantom-route in disguise.
  for (const [label, category] of Object.entries(LABEL_TO_CATEGORY)) {
    if (category in CATEGORY_TO_ROUTE_ID) continue;
    if (category in EXCLUDED_CATEGORIES) continue;
    issues.push({
      type: "error",
      message:
        `label "${label}" normalizes to "${category}" which is neither a ` +
        "canonical category (CATEGORY_TO_ROUTE_ID) nor explicitly excluded " +
        "(EXCLUDED_CATEGORIES). Add the route or declare the exclusion.",
    });
  }

  // 3. Every excluded category must carry a reason.
  for (const [category, reason] of Object.entries(EXCLUDED_CATEGORIES)) {
    if (!reason) {
      issues.push({
        type: "error",
        message: `excluded category "${category}" is missing its reason string.`,
      });
    }
  }

  // 4. Every real fingerprint label must have an intentional mapping. If a
  //    fingerprint is renamed and nobody updates the registry, this fires.
  for (const f of fingerprints || []) {
    if (!f.label) continue;
    if (!(f.label in LABEL_TO_CATEGORY)) {
      issues.push({
        type: "error",
        message:
          `fingerprint route "${f.id}" label "${f.label}" has no mapping in ` +
          "LABEL_TO_CATEGORY. Add an intentional mapping — if this is a rename, " +
          "keep the old label as a LEGACY_ALIAS too.",
      });
    }
  }

  // 5. Legacy aliases must still exist and map to the same category as their
  //    replacement. This is the Coding Hinge → The Engineer guard.
  for (const [alias, current] of Object.entries(LEGACY_ALIASES)) {
    if (!(alias in LABEL_TO_CATEGORY) || !(current in LABEL_TO_CATEGORY)) {
      issues.push({
        type: "error",
        message:
          `legacy alias "${alias}" → "${current}" references a label missing ` +
          "from LABEL_TO_CATEGORY.",
      });
      continue;
    }
    if (LABEL_TO_CATEGORY[alias] !== LABEL_TO_CATEGORY[current]) {
      issues.push({
        type: "error",
        message:
          `legacy alias "${alias}" maps to "${LABEL_TO_CATEGORY[alias]}" but its ` +
          `replacement "${current}" maps to "${LABEL_TO_CATEGORY[current]}". ` +
          "A rename must preserve the canonical category.",
      });
    }
  }

  // 6. Every fingerprint route id must be reachable from some canonical
  //    category. An unmapped real route is measurement blind-spot.
  for (const f of fingerprints || []) {
    if (!f.id) continue;
    if (!(f.id in ROUTE_ID_TO_CATEGORY)) {
      issues.push({
        type: "warning",
        message:
          `fingerprint route "${f.id}" has no inverse entry in ` +
          "ROUTE_ID_TO_CATEGORY — evals that key on route ids will not measure it.",
      });
    }
  }

  return issues;
}
